import { Server, Socket } from 'net'
import { Paths } from './paths.js'
import { existsSync, readFileSync } from 'fs'
import { PlayerEvents, RegistryEvents, RegistryPlayerInfo, PlayerInfo, PlayerStream, EngineEvents } from './types.js'
import { KafkaUtil } from './kafka.js'

export class EngineServer {
    public paths: Paths = new Paths(`./`) // es simplemente un objecto para que sea facil obtener la ruta de por ejemplo la base de datos
    public io: Server
    public registeredPlayers: Record<string, RegistryPlayerInfo> = this.getPlayers() // un mapa para almacenar la informacion del jugador siendo la key el alias y el valor la instancia del jugador
    public playerSockets: Record<string, Socket> = {} // un mapa para almacenar la informacion del socket siendo la key el alias del jugador y el valor la instancia socket, solo funciona para cerrar el server cuando no hay players
    public connectedPlayers: Record<string, PlayerInfo> = {}
    public gameStarted: boolean = false
    public gameFinished: boolean = false
    public map: string[][]

    constructor(        
        public SERVER_PORT: number,
        public KAFKA_HOST: string,
        public KAFKA_PORT: number,
    ) {
        this.io = new Server()
        this.map = this.getEmptyMap()
    }

    public getEmptyMap(): string[][] {
        const map: string[][] = []
        const row: string [] = []

        for (let i = 0; i < 19; i++) { 
            for (let j = 0; j < 19; j++) { 
                row.push(' ')
            }
            map.push(row)
        }
        return map
    }

    public printBoard() {
        for (let i = 0; i < this.map.length; i++) { 
            console.log(this.map[i].join(''))
        }
    }

    public getPlayers(): Record<string, RegistryPlayerInfo> { // cuando se crea un objeto lee el json para cargar los datos de antiguas ejecuciones
        if(!existsSync(this.paths.dataDir)) return {}

        const registeredPlayers: Record<string, RegistryPlayerInfo> = {}
        const players: Record<string, RegistryPlayerInfo> = JSON.parse(readFileSync(this.paths.dataFile("registry"), "utf8")) // leo fichero
        for(const player of Object.values(players)){ // recorro todos los jugadores que habian sido almacenados en el fichero y los vuelvo a guardar en el map
            registeredPlayers[player.alias] = player
        }

        return registeredPlayers
    }

    public signInPlayer(player: RegistryPlayerInfo, socket: Socket) {
        this.registeredPlayers = this.getPlayers() // necesario para tenerlo totalmente actualizado en este punto
        if(!this.registeredPlayers[player.alias]) throw new Error("This alias does not exist on the database")
        if(this.registeredPlayers[player.alias].password !== player.password) throw new Error("The password is not correct")
        
        socket.write(RegistryEvents.SIGN_IN_OK)
    }

    public startAuthentication() {
        this.io.on('connection', (socket: Socket) => {
            const remoteSocket = `${socket.remoteAddress}:${socket.remotePort}` // IP + Puerto del client
            console.log(`New connection from ${remoteSocket}`)
            socket.setEncoding("utf-8") // cada vez que recibe un mensaje automaticamente decodifica el mensaje, convirtiendolo de bytes a un string entendible

            socket.on("data", (message) => { // cuando envias un mensaje desde el cliente, (socket.write) -> recibes un Buffer (bytes) que hay que convertir en string .toString()                
                const [event, alias, password] = message.toString().split(':') // creamos un vector de la respuesta del cliente
                
                if (!this.playerSockets[alias]) this.playerSockets[alias] = socket
                console.log(`Received this message from the player: ${event}:${alias}:${password}`)

                const registryPlayerInfo: RegistryPlayerInfo = {
                    alias,
                    password
                }

                switch(event){
                    case PlayerEvents.SIGN_IN:
                        try{
                            this.signInPlayer(registryPlayerInfo, socket)
                        } catch(e){
                            socket.write(`${RegistryEvents.SIGN_IN_ERROR}:${e}`)
                        }
                        break
                    case PlayerEvents.END: // si el client manda el mensaje END acaba conexion
                        console.log("SOCKET DISCONNECTED: " + remoteSocket)
                        if (this.playerSockets[alias]) delete this.playerSockets[alias]
                        socket.end()
                        if (Object.values(this.playerSockets).length == 0) process.exit(0) // mata proceso en caso de que no haya conexiones
                        break
                }          
            }) 
        })
        this.io.listen(this.SERVER_PORT) // el servidor escucha el puerto 
    }

    public async newGame() {
        const kafka = new KafkaUtil('server', 'engine', 'playerMessages')

        await kafka.consumer.run({ 
            eachMessage: async (payload) => { // payload: raw message from kafka
                if (payload.message.value){ // solo entra si el valor es diferente a undefined
                    const playerMessage: PlayerStream = JSON.parse(payload.message.value.toString()) // convierto el valor del mensaje en un JSON (seria como una especie de deserializacion), Buffer -> string -> JSON
                    this.processMessage(playerMessage, kafka) // tambien envia respuestas y actualiza mapa
                    if (!this.gameStarted) {
                        if (Object.keys(this.connectedPlayers).length === 3) {
                            this.gameStarted = true // 3 jugadores conectados = empieza la partida
                            kafka.sendRecord({
                                event: EngineEvents.GAME_STARTING,
                                messageToAll: true
                            })
                            console.log("THE GAME HAS STARTED!")
                        } 
                    }
                }
            }
        })
        // cuando se inicia partida se deberia cerrar el socket que permite la autenticacion o activar un booleano que no permita unirse a la partida cuando esta este activada
        // desarrollar un timeout de la partida que la termine cuando el contador sea 0, gana el que mas nivel tiene
    }

    public processMessage(message: PlayerStream, kafka: KafkaUtil){
        switch (message.event){
            case PlayerEvents.REQUEST_TO_JOIN:
                if (!this.gameStarted) {
                    this.connectedPlayers[message.playerInfo.alias] = message.playerInfo
                    kafka.sendRecord({
                        event: EngineEvents.PLAYER_CONNECTED_OK,
                        playerAlias: `${message.playerInfo.alias}`
                    })
                    console.log(`Player ${message.playerInfo.alias} connected to the lobby`)
                }
                else {
                    kafka.sendRecord({
                        event: EngineEvents.PLAYER_CONNECTED_ERROR,
                        playerAlias: `${message.playerInfo.alias}`,
                        error: 'game already started'
                    })
                }
                break
            case PlayerEvents.NEW_POSITION:
                if (!this.gameStarted || this.gameFinished) {
                    kafka.sendRecord({
                        event: EngineEvents.GAME_NOT_PLAYABLE,
                        playerAlias: `${message.playerInfo.alias}`,
                        error: 'game not playable now (not started/finished)'
                    })
                }
                else {

                }
        }
    }
}

function main() {
    const SERVER_PORT = 5670

    const KAFKA_HOST = "localhost"
    const KAFKA_PORT = 9092 // el que este seleccionado en el docker-compose

    const engine = new EngineServer(SERVER_PORT, KAFKA_HOST, KAFKA_PORT)
    engine.startAuthentication()
    engine.newGame()
}

main()