import { Coordinate, PlayerInfo, PlayerEvents } from './types.js'
import { Socket } from 'net'
import promptSync, { Prompt } from 'prompt-sync'
import Kafka from 'node-rdkafka' 
import { playerStreamSchema, PlayerStream } from './types' 

export class Player {
    public position: Coordinate
    public baseLevel: number
    public coldEffect: number
    public hotEffect: number
    public alias: string = ''
    public password: string = ''
    public answer: string = ''
    public prompt: Prompt = promptSync()
    public intialAnswerSet: Set<string> = new Set<string>(['y', 'n'])
    public movementSet: Set<string> = new Set<string>(['N', 'S', 'W', 'E', 'NW', 'NE', 'SW', 'SE'])

    constructor(
        public ENGINE_HOST: string,
        public ENGINE_PORT: number,
        public REGISTRY_HOST: string,
        public REGISTRY_PORT: number,
        public KAFKA_HOST: string,
        public KAFKA_PORT: number,
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
        while(!this.intialAnswerSet.has(this.answer)) this.answer = this.prompt("Are you already registered?: [y/n]")
        this.askUserInfo()
        if(this.answer === 'n') this.startConnectionRegistry() // si no esta registrado se conecta al registry
        if(this.answer === 'y') this.startConnectionEngine() // si lo esta se conecta al engine directamente
    }

    public askUserInfo(){
        this.alias = this.prompt("Introduce your username: ")
        this.password = this.prompt("Introduce your password: ")
    }

    public clearInfo() {
        this.alias = ''
        this.answer = ''
        this.answer = ''
    }

    public showMenu() {
        console.log("Menu:\n 1. Edit Profile \n 2. Start a game \n 3. END")
        this.answer = this.prompt('')
    }

    public endSocket(socket: Socket){
        socket.write(PlayerEvents.END)
        socket.end()
    }

    public startConnectionRegistry(fromEngine?: boolean) {
        console.log(`Connecting to ${this.REGISTRY_HOST}:${this.REGISTRY_PORT}`) 

        const socket = new Socket() 
        socket.connect(this.REGISTRY_PORT, this.REGISTRY_HOST) 
        socket.setEncoding("utf-8")
      
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
                            this.endSocket(socket)
                    }
                }
                else {
                    const [event, _, errorMessage] = data.toString().split(':') // creamos un vector de la respuesta del server
                    console.log(`[${event}]:${errorMessage}`)
                    this.endSocket(socket)
                }
            }) 
        }) 
      
        // De momento no necesario porque los errores tambien son enviados como mensajes: socket.on("error", (err) => { console.log(err.message) })
      
        socket.on("close", () => { // cuando se confirma la finalizacion de la conexion (respuesta del servidor) 
            switch(this.answer){
                case '2': // si ha llegado aqui es porque el jugador quiere jugar
                    this.startConnectionEngine()
                    break
                case '3':  // si ha llegado aqui es porque el jugador quiere cerrar la conexion
                    console.log("Disconnected from Registry")
                    process.exit(0) // matamos el proceso del cliente. Es decir: Cliente manda END, Servidor confirma finalizacion, Cliente mata proceso
                default: // si ha llegado aqui es porque ha saltado algun error desde el servidor, reiniciamos conexion
                    this.clearInfo()
                    this.initUser()
            }
        }) 
    }

    public startConnectionEngine() { // funcion que permite la conexion con el server engine
        console.log(`Connecting to ${this.ENGINE_HOST}:${this.ENGINE_PORT}`) 

        const socket = new Socket() 
        socket.connect(this.ENGINE_PORT, this.ENGINE_HOST) 
        socket.setEncoding("utf-8") 

        socket.on("connect", () => {
            console.log(`Connected to Engine`) 

            socket.write(`${PlayerEvents.SIGN_IN}:${this.alias}:${this.password}`)
        
            socket.on("data", (data) => {
                if(data.toString().includes("OK")){
                    this.showMenu()
                    switch(this.answer){
                        case '2': 
                            this.endSocket(socket)
                            break
                        default:
                            this.endSocket(socket)
                            break
                    }
                }
                else {
                    const [event, _, errorMessage] = data.toString().split(':') // creamos un vector de la respuesta del server
                    console.log(`[${event}]:${errorMessage}`)
                    this.endSocket(socket)
                }
            }) 
        }) 
      
        socket.on("close", () => { // cuando se confirma la finalizacion de la conexion (respuesta del servidor), matamos el proceso del cliente. Es decir: Cliente manda END, Servidor confirma finalizacion, se mata el proceso del cliente 
            switch(this.answer){
                case '1': // si ha llegado aqui es porque el jugador quiere jugar
                    this.startConnectionRegistry(true)
                    break
                case '2':
                    this.joinGame()
                case '3':  // si ha llegado aqui es porque el jugador quiere cerrar la conexion
                    console.log("Disconnected from Engine") 
                    process.exit(0) // matamos el proceso del cliente. Es decir: Cliente manda END, Servidor confirma finalizacion, Cliente mata proceso
                default: // si ha llegado aqui es porque ha saltado algun error desde el servidor, reiniciamos todo el proceso
                    this.clearInfo()
                    this.initUser()
            }
        }) 
    }

    public joinGame() {
        const producer = Kafka.Producer.createWriteStream({
                'metadata.broker.list': `${this.KAFKA_HOST}:${this.KAFKA_PORT}` // check docker-compose (port)
            }, {}, {
                topic: 'test' // 3rd parameter is topics
            }
        ) 
        
        producer.on('error', (err) => {
            console.error('Error in our kafka stream') 
            console.error(err) 
        })

        this.askMovement()

        const message: PlayerStream = {
            event: PlayerEvents.NEW_POSITION,
            alias: this.alias,
            position: this.position
        }

        const success = producer.write(playerStreamSchema.toBuffer(message))
        if(success) console.log(`message queued (${JSON.stringify(message)})`)
    }

    public askMovement(){
        while(!this.movementSet.has(this.answer)){
            this.answer = this.prompt("Introduce a movement [N, S, W, E, NW, NE, SW, SE]: ")
        }
        switch(this.answer){
            case 'N':
                this.moveN()
                break
            case 'S':
                this.moveS()
                break
            case 'W':
                this.moveW()
                break
            case 'E':
                this.moveE()
                break
            case 'NW':
                this.moveNW()
                break
            case 'NE':
                this.moveNE()
                break
            case 'SW':
                this.moveSW()
                break
            case 'SE':
                this.moveSE()
                break
        }
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
    const ENGINE_HOST = "localhost" // aqui se escribira la ip del ordenador donde este lanzado el server (engine & registry), pero si lo haces todo desde el mismo pc en diferentes terminales es localhost
    const ENGINE_PORT = 5667

    const REGISTRY_HOST = "localhost"
    const REGISTRY_PORT = 6576

    const KAFKA_HOST = "localhost"
    const KAFKA_PORT = 9092 // el que este seleccionado en el docker-compose

    const player = new Player(ENGINE_HOST, ENGINE_PORT, REGISTRY_HOST, REGISTRY_PORT, KAFKA_HOST, KAFKA_PORT)
    player.initUser()
}

main()

/*
const [event, message, errorMessage] = data.toString().split(':') // creamos un vector de la respuesta del server

if(event === EngineEvents.MOVEMENT_ERROR) console.log(`[${event}]:${errorMessage}`)
console.log(`[${event}]:${message}`)
this.askMovement()
socket.write(`${PlayerEvents.NEW_POSITION}:${this.alias}:${this.position}`) // Enviamos al servidor el evento, alias y nueva posicion
*/