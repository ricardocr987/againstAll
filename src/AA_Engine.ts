import { Server, Socket } from 'net'
//import { PlayerMessage } from './types'
import { Player } from './AA_Player.js'

export class EngineServer {
    public port: number
    public io: Server
    //private game: AgainstAll
    // La idea es utilizar dos mapas:
    public players: Record<string, Player> = {} // un mapa para almacenar la informacion del jugador siendo la key el alias y el valor la instancia del jugador
    public connections: Record<string, Socket> = {} // un mapa para almacenar la informacion del socket siendo la key el alias del jugador y el valor la instancia socket

    constructor(port: number) {
        this.port = port
        this.io = new Server()
        //this.game = new AgainstAll()
    }

    public Start() {
        this.io.listen(this.port) // el servidor escucha el puerto 

        this.io.on('connection', (socket: Socket) => {
            const remoteSocket = `${socket.remoteAddress}:${socket.remotePort}` // IP + Puerto del client
            console.log(`New connection from ${remoteSocket}`)
            socket.setEncoding("utf-8") // cada vez que recibe un mensaje automaticamente decodifica el mensaje, convirtiendolo de bytes a un string entendible

            socket.on("data", (message) => { // cuando envias un mensaje desde el cliente, (socket.write) -> recibes un Buffer (bytes) que hay que decodificar
                if (!this.connections[remoteSocket]) { // este es el primer mensaje que deberia enviar el cliente, es decir el nombre de usuario, por tanto si no esta en el mapa se almacena su informacion en el
                    console.log(`Username ${message} set for connection ${remoteSocket}`) 
                    this.connections[message.toString()] = socket// hay que deserializar el buffer
                } else if (message.toString() === "END") { // si el cliente manda el mensaje END acaba conexion
                    console.log('socket disconnected : ' + remoteSocket)
                    if (this.players && this.players[remoteSocket]) delete this.players[remoteSocket]
                    socket.end() 
                } else { // envia el mensaje al resto de usuarios
                    const fullMessage = `[${this.players[remoteSocket]}]: ${message}` 
                    console.log(`${remoteSocket} -> ${fullMessage}`) 
                    this.sendMessage(fullMessage, socket) 
                }
            }) 
        })
    }

    public sendMessage (message: string, origin: Socket) { // Manda el mensaje a todos los jugadores menos al cliente que envia el mensaje
        for(const socket of Object.values(this.connections)) {
            if (socket !== origin) {
                socket.write(message) 
            }
        }
    } 
}

function main() {
    const PORT = 1346
    new EngineServer(Number(PORT)).Start()
}

main()


/* ESTO ES CODIGO DE OTROS TUTORIALES/ARTICULOS QUE NO HE INTRODUCIDO AUN
import express from 'express'
import { Server } from "socket.io"
import cors from 'cors'
import { createServer, Server as HTTPServer } from 'http'
import { Events, PlayerMessage } from './types'

export class EngineServer {  
    private _app: express.Application = express()
    private server: HTTPServer
    private io: Server
 
    constructor (
        public port: number
    ) {
        this._app.use(cors())
        this._app.options('*', cors())
        this.server = createServer(this._app)
        this.io = new Server(this.server)
        this.listen()
    }

    get app (): express.Application {
        return this._app 
    }

    private listen (): void {
        // server listening on our defined port
        this.server.listen(this.port, () => {
           console.log('Running server on port %s', this.port) 
        }) 

        //socket events
        this.io.on(Events.CONNECT, (socket: any) => {
           console.log('Connected client on port %s.', this.port) 
           
           socket.on(Events.MOVEMENT, (m: PlayerMessage) => {
              console.log('[server](message): %s', JSON.stringify(m)) 
              this.io.emit('message', m) 
           }) 

           socket.on(Events.DISCONNECT, () => {
              console.log('Client disconnected') 
           }) 
        }) 
     }
}*/