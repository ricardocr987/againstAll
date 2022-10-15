import { Paths } from './paths.js'
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs'
import { format, Options } from 'prettier'
import { Server, Socket } from 'net'
import { Events, RegistryPlayerInfo } from './types.js'

export class Registry {
    public paths: Paths = new Paths(`./`) // es simplemente un objecto para que sea facil obtener la ruta de por ejemplo la base de datos
    public options: Options = {
        semi: false,
        singleQuote: true,
        trailingComma: 'es5',
        useTabs: false,
        tabWidth: 2,
        arrowParens: 'always',
        printWidth: 80,
        parser: 'json',
    } // necesario para darle el formato correcto al record, registeredPlayers es un map clave-valor, no puede haber dos jugadores con la misma clave, es decir el alias,
    // como valor establece toda la instancia del jugador, es decir que tengo toda su informacion

    public port: number
    public io: Server
    // La idea es utilizar dos mapas:
    public players: Record<string, RegistryPlayerInfo> = this.getPlayers() // un mapa para almacenar la informacion del jugador siendo la key el alias y el valor la instancia del jugador
    public connections: Record<string, Socket> = {} // un mapa para almacenar la informacion del socket siendo la key el alias del jugador y el valor la instancia socket

    constructor(port: number) {
        this.port = port
        this.io = new Server()
    }

    public getPlayers(): Record<string, RegistryPlayerInfo> { // // cuando se crea un objeto lee el json para cargar los datos de antiguas ejecuciones
        if(!existsSync(this.paths.dataDir)) return {}

        const registeredPlayers: Record<string, RegistryPlayerInfo> = {}
        const players: Record<string, RegistryPlayerInfo> = JSON.parse(readFileSync(this.paths.dataFile('registry'), 'utf8')) // leo fichero
        for(const player of Object.values(players)){ // recorro todos los jugadores que habian sido almacenados en el fichero y los vuelvo a guardar en el map
            registeredPlayers[player.alias] = player
        }

        return registeredPlayers
    }

    public registerPlayer(player: RegistryPlayerInfo) { // creo perfil de player
        if(this.players[player.alias]) throw new Error('There is already a player with the same alias')

        this.players[player.alias] = player
        if(!existsSync(this.paths.dataDir))
            mkdirSync(this.paths.dataDir)

        writeFileSync(this.paths.dataFile('registry'), format(JSON.stringify(this.players).trim(), this.options)) // sobreescribo todo el fichero pero incluyendo al nuevo

        return true
    }

    public signInPlayer(player: RegistryPlayerInfo): boolean {
        if(!this.players[player.alias]) throw new Error('This alias does not exist on the database')
        if(this.players[player.alias].password != player.password) throw new Error('The password is not correct') // no tengo claro que esto sea necesario

        return true
    }

    public editPlayer(player: RegistryPlayerInfo) {
        if(!this.players[player.alias]) throw new Error('This alias does not exist on the database')
        if(this.players[player.alias].password != player.password) throw new Error('The password is not correct') // no tengo claro que esto sea necesario

        this.players[player.alias] = player // simplemente sobreescribo los datos del player
        if(!existsSync(this.paths.dataDir))
            mkdirSync(this.paths.dataDir)

        writeFileSync(this.paths.dataFile('registry'), format(JSON.stringify(this.players).trim(), this.options)) 
    }

    public Start() {
        this.io.listen(this.port) // el servidor escucha el puerto 

        this.io.on('connection', (socket: Socket) => {
            const remoteSocket = `${socket.remoteAddress}:${socket.remotePort}` // IP + Puerto del client
            console.log(`New connection from ${remoteSocket}`)
            socket.setEncoding("utf-8") // cada vez que recibe un mensaje automaticamente decodifica el mensaje, convirtiendolo de bytes a un string entendible

            socket.on("data", (message) => { // cuando envias un mensaje desde el cliente, (socket.write) -> recibes un Buffer (bytes) que hay que decodificar, para convertirlo en string .toString()
                const [event, alias, password] = message.toString().split(':') // creamos un vector de la respuesta del cliente con las tres variables

                if (!this.connections[remoteSocket]) this.connections[remoteSocket] = socket // este es el primer mensaje que deberia enviar el cliente, es decir el nombre de usuario (message), 
                // por tanto si no esta en el mapa se almacena la informacion del socket en el map 
                
                console.log(`Username ${alias} set for connection ${remoteSocket}`)

                const playerInfo: RegistryPlayerInfo = {
                    alias,
                    password
                }

                if (!this.players[remoteSocket]) this.players[remoteSocket] = playerInfo

                switch(event){
                    case Events.SIGN_UP:
                        const resp = this.registerPlayer(playerInfo)
                        if (resp) socket.write('SUCCESSFUL SIGN UP\n')
                        break
                    case Events.SIGN_IN:
                        const check = this.signInPlayer(playerInfo)
                        if (check) socket.write('SUCCESSFUL SIGN IN\n')
                        break
                    case Events.END: // si el client manda el mensaje END acaba conexion
                        console.log('SOCKET DISCONNECTED: ' + remoteSocket)
                        if (this.connections[remoteSocket]) delete this.connections[remoteSocket]
                        socket.end()
                }

                const fullMessage = `[${this.players[remoteSocket].alias}]: ${message}` 
                console.log(`${remoteSocket} -> ${fullMessage}`) 
                this.sendMessage(fullMessage, socket)                  
            }) 
        })
    }

    public sendMessage (message: string, origin: Socket) { // Manda el mensaje solo al usuario que ha hecho la conexion
        for(const socket of Object.values(this.connections)) {
            if (socket === origin) {
                socket.write(message)
            }
        }
    } 
}

function main() {
    const PORT = 1349
    new Registry(Number(PORT)).Start()
}

main()