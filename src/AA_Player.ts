import { Coordinate, PlayerInfo, PlayerEvents, PlayerStream, KafkaMessage, EngineStream, EngineEvents } from './types.js'
import { Socket } from 'net'
import promptSync, { Prompt } from 'prompt-sync'
import { KafkaUtil } from './kafka.js'
//import { playerStreamSchema, PlayerStream } from './types.js' 

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
    public startedGame = false
    public finishedGame = false

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
        console.log("Menu:\n 1. Edit Profile \n 2. Join to a game \n 3. END")
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
            if(fromEngine){
                this.askUserInfo()
                socket.write(`${PlayerEvents.EDIT_PROFILE}:${this.alias}:${this.password}`)
            }
            else {
                socket.write(`${PlayerEvents.SIGN_UP}:${this.alias}:${this.password}`)
            }

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
      
        socket.on("close", () => { // cuando se confirma la finalizacion de la conexion (respuesta del servidor) 
            switch(this.answer){
                case '2': // si ha llegado aqui es porque el jugador quiere jugar
                    this.startConnectionEngine(true)
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

    public startConnectionEngine(fromRegistry?: boolean) { // funcion que permite la conexion con el server engine
        console.log(`Connecting to ${this.ENGINE_HOST}:${this.ENGINE_PORT}`) 

        const socket = new Socket() 
        socket.connect(this.ENGINE_PORT, this.ENGINE_HOST) 
        socket.setEncoding("utf-8") 

        socket.on("connect", () => {
            console.log(`Connected to Engine`) 

            if(fromRegistry){ // esto es necesario para llamar joinGame() cuando el usuario viene de registrarse sin tener que pasar por el proceso del menu, mejorar!
                this.answer = '2' // esta variable ya deberia de ser '2' pero me gustaria comprobarlo
                this.endSocket(socket)
            }
            else {
                socket.write(`${PlayerEvents.SIGN_IN}:${this.alias}:${this.password}`)
            }
        
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
                case '1': // si ha llegado aqui es porque el jugador quiere editar perfil
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

    public async joinGame() {
        const kafka = this.startKafka()

        while(!this.startedGame) {
            console.log("Wait to start playing...")
            let check = this.prompt('')
            if (check) console.log("Game has not started yet") // esto deberia contestarlo engine
        }

        console.log("THE GAME HAS STARTED!")

        while(!this.finishedGame) { // mientras la partida siga activa....
            this.askMovement()

            kafka.sendRecord({
                event: PlayerEvents.NEW_POSITION,
                playerInfo: this.getPlayerInfo()
            })

            this.processMessages(kafka.messages)
        }
    }

    public startKafka(): KafkaUtil {
        const kafka = new KafkaUtil(this.alias, 'player', 'engineMessages')
        try {
            kafka.startProducer()
            kafka.startConsumer()
            const event: PlayerStream = { // primer mensaje del jugador al engine para solicitar unirse a la partida
                event: PlayerEvents.REQUEST_TO_JOIN,
                playerInfo: this.getPlayerInfo()
            }
            kafka.sendRecord(event)
        }
        catch(e){
            console.log(e)
        }
        return kafka
    }

    public processMessages(messages: KafkaMessage[]){
        for(const message of messages){
            if (message.processed) continue // quizas seria mejor eliminar los mensajes ya procesador por eficiencia

            if(message.message.value) {
                const parsedMessage: EngineStream = JSON.parse(message.message.value.toString())
                switch (parsedMessage.event){
                    case EngineEvents.DEATH:
                        this.finishedGame = true
                        console.log(parsedMessage.map) // mostrar mapa bonito
                        console.log('You lost')
                        break
                    case EngineEvents.KILL:
                        console.log(parsedMessage.map)
                        console.log('You have killed someone')
                        break
                    case EngineEvents.LEVEL_UP:
                        console.log('You have eaten food and leveled up')
                    case EngineEvents.GAME_ENDED:
                        this.finishedGame = true
                        console.log('The game has ended')
                        break
                }
                message.processed = true
            }
            else {
                console.log("Error: Received a undefined message")
            }
        }
    }

    public getPlayerInfo(): PlayerInfo {
        return {
            alias: this.alias,
            position: this.position,
            baseLevel: this.baseLevel,
            coldEffect: this.coldEffect,
            hotEffect: this.hotEffect,
        }
    }

    public askMovement(){
        while(!this.movementSet.has(this.answer)){
            console.log("Introduce a movement [N, S, W, E, NW, NE, SW, SE]: ")
            this.answer = this.prompt("")
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

    public modifyLevel(amount: number) {
        this.baseLevel += amount
    }
}

function main() {
    const ENGINE_HOST = "localhost" // aqui se escribira la ip del ordenador donde este lanzado el server (engine & registry), pero si lo haces todo desde el mismo pc en diferentes terminales es localhost
    const ENGINE_PORT = 5670

    const REGISTRY_HOST = "localhost"
    const REGISTRY_PORT = 6579

    const KAFKA_HOST = "localhost"
    const KAFKA_PORT = 9092 // el que este seleccionado en el docker-compose (KAFKA_LISTENERS)

    const player = new Player(ENGINE_HOST, ENGINE_PORT, REGISTRY_HOST, REGISTRY_PORT, KAFKA_HOST, KAFKA_PORT)
    player.initUser()
}

main()