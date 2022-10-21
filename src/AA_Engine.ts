import { Server, Socket } from 'net'
import { Paths } from './paths.js'
import { existsSync, readFileSync } from 'fs'
import Kafka from 'node-rdkafka' 
import { PlayerEvents, RegistryEvents, RegistryPlayerInfo, PlayerInfo,playerStreamSchema } from './types.js'

export class EngineServer {
    public paths: Paths = new Paths(`./`) // es simplemente un objecto para que sea facil obtener la ruta de por ejemplo la base de datos
    public io: Server
    public registeredPlayers: Record<string, RegistryPlayerInfo> = this.getPlayers() // un mapa para almacenar la informacion del jugador siendo la key el alias y el valor la instancia del jugador
    public playerSockets: Record<string, Socket> = {} // un mapa para almacenar la informacion del socket siendo la key el alias del jugador y el valor la instancia socket, solo funciona para cerrar el server cuando no hay players
    public playerInfos: Record<string, PlayerInfo> = {}

    constructor(        
        public SERVER_PORT: number,
        public KAFKA_HOST: string,
        public KAFKA_PORT: number,
    ) {
        this.io = new Server()
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

    public startConsumer() {
        const consumer = new Kafka.KafkaConsumer({
            'group.id': 'kafka',
            'metadata.broker.list': `${this.KAFKA_HOST}:${this.KAFKA_PORT}`, //localhost:9092',
        }, {})

        consumer.connect() 

        consumer.on('ready', () => {
            console.log('consumer ready..')
            consumer.subscribe(["test"]) 
            consumer.consume() 
        }).on('data', function(data) {
            if (data.value) console.log(`received message: ${playerStreamSchema.fromBuffer(data.value)}`) 
        }) 

    }
}

function main() {
    const SERVER_PORT = 5667

    const KAFKA_HOST = "localhost"
    const KAFKA_PORT = 9092 // el que este seleccionado en el docker-compose

    const engine = new EngineServer(SERVER_PORT, KAFKA_HOST, KAFKA_PORT)
    engine.startAuthentication()
    engine.startConsumer()
}

main()

/*
const position: Coordinate = {
    x: Number(positionX),
    y: Number(positionY)
}

const playerInfo: PlayerInfo = {
    alias: alias,
    position: position,
    baseLevel: Number(baseLevel),
    coldEffect: Number(coldEffect),
    hotEffect: Number(hotEffect)
}

        socket.on("connect", () => {
            console.log(`Connected to Registry`) 

            // si se llama desde Engine es para editar el usuario, si no el usuario quiere registrarse
            // la autenticacion (inicio sesion) la tiene que hacer engine, por tanto, el registry solo se utiliza para crear/editar una cuenta
            // Enviamos al servidor el evento, alias y password
            fromEngine ? 
                socket.write(`${PlayerEvents.EDIT_PROFILE}:${this.alias}:${this.password}`) : 
                socket.write(`${PlayerEvents.SIGN_UP}:${this.alias}:${this.password}`)

            socket.on("data", (data) => { // aqui se entra cuando el player recibe informacion desde registry
                if(data.toString().includes("OK")){ // si el mensaje incluye un OK muestra el menu, si no es porque ha saltado un error
                    this.showMenu()
                    switch(this.answer){
                        case '1':
                            this.askUserInfo()
                            socket.write(`${PlayerEvents.EDIT_PROFILE}:${this.alias}:${this.password}`)
                            break
                        default: // si quiere empezar partida se desconecta del registry y se conecta al engine
                            socket.write(PlayerEvents.END)
                            socket.end()
                    }
                }
                else {
                    const [event, _, errorMessage] = data.toString().split(':') // creamos un vector de la respuesta del server
                    console.log(`[${event}]:${errorMessage}`)
                    socket.write(PlayerEvents.END)
                    socket.end()
                }
            }) 
        }) 
        socket.on("close", () => { // cuando se confirma la finalizacion de la conexion (respuesta del servidor) 
            switch(this.answer){
                case '2': // si ha llegado aqui es porque el jugador quiere jugar
                    this.StartConnectionEngine()
                    break
                case '3':  // si ha llegado aqui es porque el jugador quiere cerrar la conexion
                    console.log("Disconnected from Registry")
                    process.exit(0) // matamos el proceso del cliente. Es decir: Cliente manda END, Servidor confirma finalizacion, Cliente mata proceso
                default: // si ha llegado aqui es porque ha saltado algun error desde el servidor, reiniciamos conexion
                    this.initUser()
            }
        }) 
*/