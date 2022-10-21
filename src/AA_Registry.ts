import { Paths } from './paths.js'
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs'
import { format, Options } from 'prettier'
import { Server, Socket } from 'net'
import { PlayerEvents, RegistryEvents, RegistryPlayerInfo } from './types.js'

const options: Options = {
    semi: false,
    singleQuote: true,
    trailingComma: 'es5',
    useTabs: false,
    tabWidth: 2,
    arrowParens: 'always',
    printWidth: 80,
    parser: 'json',
} // necesario para darle el formato correcto al mapa a la hora de escribir el fichero json

export class Registry {
    public paths: Paths = new Paths(`./`) // es simplemente un objecto para que sea facil obtener la ruta de por ejemplo la base de datos
    public port: number
    public io: Server
    // La idea es utilizar dos mapas:
    public registeredPlayers: Record<string, RegistryPlayerInfo> = this.getPlayers() // un mapa para almacenar la informacion del jugador siendo la key el alias y el valor info sobre el player
    public playerSockets: Record<string, Socket> = {} // un mapa para almacenar la informacion del socket siendo la key el alias del jugador y el valor la instancia socket, solo funciona para cerrar el server cuando no hay players

    constructor(port: number) {
        this.port = port
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

    public registerPlayer(player: RegistryPlayerInfo, socket: Socket) { // creo perfil de player
        if(this.registeredPlayers[player.alias]) throw new Error("There is already a player with the same alias")

        socket.write(RegistryEvents.SIGN_UP_OK)

        this.registeredPlayers[player.alias] = player
        if(!existsSync(this.paths.dataDir))
            mkdirSync(this.paths.dataDir)

        writeFileSync(this.paths.dataFile("registry"), format(JSON.stringify(this.registeredPlayers).trim(), options)) // sobreescribo todo el fichero pero incluyendo al nuevo
    }

    public editPlayer(player: RegistryPlayerInfo, socket: Socket) {
        if(!this.registeredPlayers[player.alias]) throw new Error("This alias does not exist on the database")

        socket.write(RegistryEvents.EDIT_PROFILE_OK)

        this.registeredPlayers[player.alias] = player // simplemente sobreescribo los datos del player
        if(!existsSync(this.paths.dataDir))
            mkdirSync(this.paths.dataDir)

        writeFileSync(this.paths.dataFile("registry"), format(JSON.stringify(this.registeredPlayers).trim(), options)) 
    }

    public Start() {
        this.io.on("connection", (socket: Socket) => {
            const remoteSocket = `${socket.remoteAddress}:${socket.remotePort}` // IP + Puerto del client
            console.log(`New connection from ${remoteSocket}`)
            socket.setEncoding("utf-8") // cada vez que recibe un mensaje automaticamente decodifica el mensaje, convirtiendolo de bytes a un string entendible

            socket.on("data", (message) => { // cuando envias un mensaje desde el cliente, (socket.write) -> recibes un Buffer (bytes) que hay que hay que convertir en string .toString()
                const [event, alias, password] = message.toString().split(':') // creamos un vector de la respuesta del cliente con las tres variables

                if (!this.playerSockets[alias]) this.playerSockets[alias] = socket
                console.log(`Received this message from the player: ${event}:${alias}:${password}`)

                const playerInfo: RegistryPlayerInfo = {
                    alias,
                    password
                }


                switch(event){
                    case PlayerEvents.SIGN_UP:
                        try{
                            this.registerPlayer(playerInfo, socket)
                        } catch(e){
                            socket.write(`${RegistryEvents.SIGN_UP_ERROR}:${e}`)
                        }
                        break
                    case PlayerEvents.EDIT_PROFILE:
                        try{
                            this.editPlayer(playerInfo, socket)
                        } catch(e){
                            socket.write(`${RegistryEvents.EDIT_PROFILE_ERROR}:${e}`)
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
        this.io.listen(this.port) // el servidor escucha el puerto 
    }
}

function main() {
    const PORT = 6576
    new Registry(Number(PORT)).Start()
}

main()