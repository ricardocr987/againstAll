import { Coordinate, PlayerInfo, PlayerEvents } from './types.js'
import { Socket } from 'net'
import promptSync from 'prompt-sync'

export class Player {
    public position: Coordinate
    public baseLevel: number
    public coldEffect: number
    public hotEffect: number
    public alias: string = ""
    public password: string = ""
    public answer: string = ""
    public prompt = promptSync()

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
        while(this.answer != 'y' && this.answer != 'n'){
            this.answer = this.prompt("Are you already registered?: [y/n]")
        }
        this.askUserInfo()
    }

    public askUserInfo(){
        this.alias = this.prompt("Introduce your username: ")
        this.password = this.prompt("Introduce your password: ")
    }

    public showMenu(socket: Socket) {
        console.log("Menu:\n 1. Edit Profile \n 2. Start a game \n 3. END")
        this.answer = this.prompt("")
        switch(this.answer){
            case "1":
                this.askUserInfo()
                socket.write(`${PlayerEvents.EDIT_PROFILE}:${this.alias}:${this.password}`)
                break
            case "2":
                // Conectar al engine/partida
            case "3":
                socket.write(PlayerEvents.END)
                socket.end() 
                break
        }
    }

    public StartConnectionRegistry() {
        console.log(`Connecting to ${this.HOST}:${this.REGISTRY_PORT}`) 

        const socket = new Socket() 
        socket.connect(this.REGISTRY_PORT, this.HOST) 
        socket.setEncoding("utf-8") 
      
        socket.on("connect", () => {
            switch(this.answer){
                case "y":
                    socket.write(`${PlayerEvents.SIGN_IN}:${this.alias}:${this.password}`) // Enviamos al servidor el evento, alias y password
                    break
                case "n":
                    socket.write(`${PlayerEvents.SIGN_UP}:${this.alias}:${this.password}`)
                    break
            }
        
            socket.on("data", (data) => {
                if(data.toString().includes("OK")){
                    this.showMenu(socket)
                }
                else {
                    const [event, _, errorMessage] = data.toString().split(':') // creamos un vector de la respuesta del server
                    console.log(`[${event}]:${errorMessage}`)
                    this.initUser()
                    this.showMenu(socket)
                }
            }) 
        }) 
      
        // De momento no necesario: socket.on("error", (err) => { console.log(err.message) })
      
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
    const HOST = "localhost" // aqui se escribira la ip del ordenador donde este lanzado el server (engine & registry), pero si lo haces todo desde el mismo pc en diferentes terminales es localhost
    const SERVER_PORT = 1346
    const REGISTRY_PORT = 1364
    
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