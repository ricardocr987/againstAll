import { Coordinate, PlayerInfo, Events } from './types.js'
import { Socket } from 'net'
import { Interface, createInterface } from 'readline'
import promptSync from 'prompt-sync'

const readline: Interface = createInterface({
    input: process.stdin, 
    output: process.stdout
})

export class Player {
    public position: Coordinate
    public baseLevel: number
    public coldEffect: number
    public hotEffect: number
    public alias: string = ""
    public password: string = ""
    public answer: string = ""

    constructor(
        public HOST: string,
        public SERVER_PORT: number,
        public REGISTRY_PORT: number
    ) {
        this.position = {
            x: Math.floor(Math.random() * 20) + 1, // posicion horizontal
            y: Math.floor(Math.random() * 20) + 1 // posicion vertical
        }
        this.baseLevel = 1
        this.coldEffect = Math.floor(Math.random() * 20) - 10
        this.hotEffect = Math.floor(Math.random() * 20) - 10
    }

    public initUser(){
        const prompt = promptSync();

        this.answer = prompt("Are you already registered?: [y/n]")
        this.alias = prompt("Introduce your username: ")
        this.password = prompt("Introduce your password: ")
    }

    public StartConnectionRegistry() {
        console.log(`Connecting to ${this.HOST}:${this.REGISTRY_PORT}`) 

        const socket = new Socket() 
        socket.connect(this.REGISTRY_PORT, this.HOST) 
        socket.setEncoding("utf-8") 
      
        socket.on("connect", () => {
            console.log("Connected") 

            switch(this.answer){
                case "y":
                    // Enviamos al servidor el evento, alias y password
                    socket.write(`${Events.SIGN_IN}:${this.alias}:${this.password}`)
                    break
                case "n":
                    socket.write(`${Events.SIGN_UP}:${this.alias}:${this.password}`)
                    break
            }

            readline.on("line", (message) => {
                socket.write(message) 
                if (message === Events.END) socket.end() 
              }) 
        
            socket.on("data", (data) => {
                console.log(data) 
            }) 
        }) 
      
        socket.on("error", (err) => { throw new Error(err.message) })
      
        socket.on("close", () => { // cuando se confirma la finalizacion de la conexion (respuesta del servidor), matamos el proceso del cliente. Es decir: Cliente manda END, Servidor confirma finalizacion, Cliente mata proceso 
          console.log("Disconnected") 
          process.exit(0) // mata proceso
        }) 
    }

    public StartConnectionEngine() { // funcion que permite la conexion con el server engine
        console.log(`Connecting to ${this.HOST}:${this.SERVER_PORT}`) 

        const socket = new Socket() 
        socket.connect(this.SERVER_PORT, this.HOST) 
        socket.setEncoding("utf-8") 
      
        socket.on("connect", () => {
          console.log("Connected") 
      
          readline.question("Choose your username: ", (username) => {
            socket.write(username) 
            console.log(`Type any message to send it, type END to finish`)
          }) 
      
          readline.on("line", (message) => {
            socket.write(message) 
            if (message === 'END') {
              socket.end() 
            }
          }) 
      
          socket.on("data", (data) => {
            console.log(data) 
          }) 
        }) 
      
        socket.on("error", (err) => { throw new Error(err.message) })
      
        socket.on("close", () => { // cuando se confirma la finalizacion de la conexion (respuesta del servidor), matamos el proceso del cliente. Es decir: Cliente manda END, Servidor confirma finalizacion, Cliente mata proceso 
          console.log("Disconnected") 
          process.exit(0) // mata proceso
        }) 
    }

    public moveN() { // si level = 0, throw error para terminar su partida y que no pueda moverse? preferible que se desconecte de la partida nada mas morir
        this.position.x - 1
    }

    public moveS() {
        this.position.x + 1
    }

    public moveW() {
        this.position.y - 1
    }

    public moveE() {
        this.position.y + 1
    }

    public moveNW() {
        this.position.x - 1
        this.position.y - 1
    }

    public moveNE() {
        this.position.x + 1
        this.position.y + 1
    }

    public moveSW() {
        this.position.x + 1
        this.position.y - 1
    }

    public moveSE() {
        this.position.x - 1
        this.position.y + 1
    }

    public get level(): number {
        return this.baseLevel
    }

    public get username(): string {
        return this.alias
    }

    public get player(): PlayerInfo {
        return { 
            alias: this.alias,
            position: this.position,
            baseLevel: this.baseLevel,
            coldEffect: this.coldEffect,
            hotEffect: this.hotEffect
        }
    }

    public modifyLevel(amount: number) {
        this.baseLevel += amount
    }
}

function main() {
    const HOST = "localhost" // aqui se escribira la ip del ordenador donde este lanzado el server (engine), pero si lo haces todo desde el mismo pc en diferentes terminales es localhost
    const SERVER_PORT = 1346
    const REGISTRY_PORT = 1352
    
    const player = new Player(HOST, SERVER_PORT, REGISTRY_PORT)
    player.initUser()
    player.StartConnectionRegistry()
}

main()


/* ESTO ES CODIGO DE OTROS TUTORIALES/ARTICULOS QUE NO HE INTRODUCIDO AUN
// Server:

const app = express() 

// settings
app.set('port', process.env.PORT || 3000) // en local se seleccionara el puerto 3000 a no ser que se defina la variable de entorno

app.get("/", (req, res) => {
    res.send("hello")
}) 

// start server
const server = app.listen(app.get('port'), () => {
    console.log('server on port', app.get('port'))
}) 

// WebSockets:

const io = new Server<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
>(server)

// Server socket communication with player:
// The events declared in the ServerToClientEvents interface are used when sending and broadcasting events:

io.on("connection", (socket) => {
    socket.emit("noArg") 
    socket.emit("basicEmit", 1, "2", Buffer.from([3])) 
    socket.emit("withAck", "4", (e) => {
      // e is inferred as number
    }) 
  
    // works when broadcast to all
    io.emit("noArg") 
  
    // works when broadcasting to a room
    io.to("room1").emit("basicEmit", 1, "2", Buffer.from([3])) 
})

// The ones declared in the ClientToServerEvents interface are used when receiving events:

io.on("connection", (socket) => {
    socket.on("hello", () => {
      // ...
    }) 
}) 

// The ones declared in the InterServerEvents interface are used for inter-server communication (added in socket.io@4.1.0):

io.serverSideEmit("ping") 

io.on("ping", () => {
  // ...
}) 

// And finally, the SocketData type is used to type the socket.data attribute (added in socket.io@4.4.0):

io.on("connection", (socket) => {
    socket.data.name = "john" 
    socket.data.age = 42 
}) 

*/
/*
// const player = new Player("NOMBRE", "PASSWORD")

// Client socket communication with registry:
const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io() 

// Similarly, the events declared in the ClientToServerEvents interface are used when sending events:

socket.emit("hello") 

// And the ones declared in ServerToClientEvents are used when receiving events:

socket.on("noArg", () => {
    // ...
}) 

socket.on("basicEmit", (a, b, c) => {
    // a is inferred as number, b as string and c as buffer
}) 

socket.on("withAck", (d, callback) => {
    // d is inferred as string and callback as a function that takes a number as argument
}) */