import { PlayerEvents, RegistryEvents, RegistryPlayerInfo } from './types.js'
import { config } from './utils/config.js'
import { paths } from './utils/utils.js'
import { existsSync, mkdirSync, writeFileSync } from 'fs'
import { format, Options } from 'prettier'
import { Server, Socket } from 'net'
import apiControler from './utils/apiController.js'

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
    public port: number
    public io: Server
    // La idea es utilizar dos mapas:
    public registeredPlayers: Record<string, RegistryPlayerInfo> = {} // un mapa para almacenar la informacion del jugador siendo la key el alias y el valor info sobre el player
    public playerSockets: Record<string, Socket> = {} // un mapa para almacenar la informacion del socket siendo la key el alias del jugador y el valor la instancia socket, solo funciona para cerrar el server cuando no hay players

    constructor(port: number) {
        this.port = port
        this.io = new Server()
    }

    public async getPlayers() { // cuando se crea un objeto lee el json para cargar los datos de antiguas ejecuciones
        const players = await apiControler.getAllPlayers()
        console.log(`Received ${players.length} registered players from the API`)
        for(const player of players){ // recorro todos los jugadores que habian sido almacenados en el fichero y los vuelvo a guardar en el map
            this.registeredPlayers[player.alias] = player
        }

        if(!existsSync(paths.dataDir)) // si no existe la carpeta data ...
            mkdirSync(paths.dataDir) // ... la crea
        // esta linea almacena la informacion del nuevo jugador en el mapa
        writeFileSync(paths.dataFile('registry'), format(JSON.stringify(this.registeredPlayers).trim(), options)) // sobreescribo todo el fichero pero incluyendo al nuevo
    }

    public async registerPlayer(alias: string, password: string, socket: Socket) { // creo perfil de player
        if(this.registeredPlayers[alias]) throw new Error('There is already a player with the same alias')

        const apiResponse = await apiControler.createPlayer({ alias: alias, password: password }) // tambien almaceno los jugadores en la base de datos de firebase llamando a la api
        console.log(`API Response status: ${apiResponse.status}, message: ${apiResponse.message}`)

        this.registeredPlayers[alias] = apiResponse.data // registeredPlayers es una variable clave valor, la clave es el alias del jugador, y el valor es toda la informacion del jugador
        writeFileSync(paths.dataFile('registry'), format(JSON.stringify(this.registeredPlayers).trim(), options)) // sobreescribo todo el fichero pero incluyendo al nuevo
        console.log(`Saved player info in a json file and in a record with all the other players`)
        
        socket.write(RegistryEvents.SIGN_UP_OK) // como no ha lanzado el error el servidor envia al player un mensaje diciendo que el registro ha sido exitoso
        console.log(`Sent this message by socket communication: ${RegistryEvents.SIGN_UP_OK}`)
    }

    public async editPlayer(player: RegistryPlayerInfo, socket: Socket) {
        if(!this.registeredPlayers[player.alias]) throw new Error('This alias does not exist on the database')

        const apiResponse = await apiControler.updatePlayer(player)
        console.log(`API Response status: ${apiResponse.status}, message: ${apiResponse.message}`)

        this.registeredPlayers[player.alias] = apiResponse.data // simplemente sobreescribo los datos del player
        writeFileSync(paths.dataFile('registry'), format(JSON.stringify(this.registeredPlayers).trim(), options))
        console.log(`Updated player info in a json file and in a record with all the other players`)
        
        socket.write(RegistryEvents.EDIT_PROFILE_OK)
        console.log(`Sent this message by socket communication: ${RegistryEvents.EDIT_PROFILE_OK}`)
    }

    public async deletePlayer(player: RegistryPlayerInfo, socket: Socket) {
        if(!this.registeredPlayers[player.alias]) throw new Error('This alias does not exist on the database')

        const apiResponse = await apiControler.deletePlayer(player.id)
        console.log(`API Response status: ${apiResponse.status}, message: ${apiResponse.message}`)

        delete this.registeredPlayers[player.alias]
        writeFileSync(paths.dataFile('registry'), format(JSON.stringify(this.registeredPlayers).trim(), options))
        console.log(`Deleted player info in a json file and in a record with all the other players`)
       
        socket.write(RegistryEvents.DELETE_PROFILE_OK)
        console.log(`Sent this message by socket communication: ${RegistryEvents.DELETE_PROFILE_OK}`)
    }

    public async start() {
        await this.getPlayers()
        this.io.on('connection', (socket: Socket) => {
            const remoteSocket = `${socket.remoteAddress}:${socket.remotePort}` // IP + Puerto del client
            console.log(`New connection from ${remoteSocket}`)
            socket.setEncoding('utf-8') // cada vez que recibe un mensaje automaticamente decodifica el mensaje, convirtiendolo de bytes a un string entendible

            socket.on('data', async (message) => { // cuando envias un mensaje desde el cliente, (socket.write) -> recibes un Buffer (bytes) que hay que hay que convertir en string .toString()
                const [event, alias, password] = message.toString().split(':') // creamos un vector de la respuesta del cliente con las tres variables

                if (!this.playerSockets[alias]) this.playerSockets[alias] = socket
                console.log(`Received this message from the player: ${event}:${alias}:${password}`)

                switch(event){
                    case PlayerEvents.SIGN_UP:
                        try{
                            await this.registerPlayer(alias, password, socket)
                            const registerEvent = await apiControler.createRegistryEvent({
                                timestamp: Date.now().toString(),
                                aliasProducer: alias,
                                ipProducer: socket.remoteAddress || 'localhost',
                                event: PlayerEvents.SIGN_UP,
                                description: `Player ${alias} has registered`,
                            })
                            console.log(`API Response status: ${registerEvent.status}, message: ${registerEvent.message}`)
                            console.log(`Event data:\n ${JSON.stringify(registerEvent.data)}`)
                        } catch(e){
                            socket.write(`${RegistryEvents.SIGN_UP_ERROR}:${e}`)
                        }
                        break
                    case PlayerEvents.EDIT_PROFILE:
                        try{
                            this.registeredPlayers[alias].alias = alias
                            this.registeredPlayers[alias].password = password
                            await this.editPlayer(this.registeredPlayers[alias], socket)
                            const registerEvent = await apiControler.createRegistryEvent({
                                timestamp: Date.now().toString(),
                                aliasProducer: alias,
                                ipProducer: socket.remoteAddress || 'localhost',
                                event: PlayerEvents.EDIT_PROFILE,
                                description: `Player ${alias} has edited his profile`,
                            })
                            console.log(`API Response status: ${registerEvent.status}, message: ${registerEvent.message}`)
                            console.log(`Event data:\n ${JSON.stringify(registerEvent.data)}`)
                        } catch(e){
                            socket.write(`${RegistryEvents.EDIT_PROFILE_ERROR}:${e}`)
                        }
                        break
                    case PlayerEvents.DELETE_PROFILE:
                        try{
                            await this.deletePlayer(this.registeredPlayers[alias], socket)
                            const registerEvent = await apiControler.createRegistryEvent({
                                timestamp: Date.now().toString(),
                                aliasProducer: alias,
                                ipProducer: socket.remoteAddress || 'localhost',
                                event: PlayerEvents.DELETE_PROFILE,
                                description: `Player ${alias} has deleted his profile`,
                            })
                            console.log(`API Response status: ${registerEvent.status}, message: ${registerEvent.message}`)
                            console.log(`Event data:\n ${JSON.stringify(registerEvent.data)}`)
                        } catch(e){
                            socket.write(`${RegistryEvents.DELETE_PROFILE_ERROR}:${e}`)
                        }
                        break
                    default: // si el client manda el mensaje END acaba conexion
                        console.log('SOCKET DISCONNECTED: ' + remoteSocket)
                        if (this.playerSockets[alias]) delete this.playerSockets[alias]
                        socket.end()
                        break
                }           
            }) 
        })

        this.io.listen(this.port) // el servidor escucha el puerto 
    }
}

async function main() {
    const REGISTRY_SERVER_PORT = Number(config.REGISTRY_SERVER_PORT) || 6580
    const registry = new Registry(REGISTRY_SERVER_PORT)
    await registry.start()
}

await main()