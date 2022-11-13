import { Coordinate, PlayerInfo, PlayerEvents, PlayerStream, EngineStream, EngineEvents } from './types.js'
import { Socket } from 'net'
import promptSync, { Prompt } from 'prompt-sync'
import { KafkaUtil } from './kafka.js'
import { config } from './config.js'

export class Player {
    // PlayerInfo
    public position: Coordinate
    public baseLevel: number
    public coldEffect: number
    public hotEffect: number
    public alias: string = ''
    public password: string = ''

    // Used to manage the user answers
    public prompt: Prompt = promptSync() // use to register the user inputs
    public answer: string = ''
    public intialAnswerSet: Set<string> = new Set<string>(['y', 'n'])
    public menuAnswerSet: Set<string> = new Set<string>(['1', '2', '3'])
    public movementSet: Set<string> = new Set<string>(['N', 'S', 'W', 'E', 'NW', 'NE', 'SW', 'SE'])

    // Flags to identify the phase of the game
    public startedGame = false
    public finishedGame = false
    public joined = false

    // to create the player instance is needed the IPs and ports of the registry, engine and kafka
    constructor( 
        public ENGINE_HOST: string,
        public ENGINE_PORT: number,

        public REGISTRY_HOST: string,
        public REGISTRY_PORT: number,

        public KAFKA_HOST: string,
        public KAFKA_PORT: number,
    ) {
        this.position = {
            x: this.randomIntFromInterval(0, 19), // 0-19
            y: this.randomIntFromInterval(0, 19) // 0-19
        }
        this.baseLevel = 1
        this.coldEffect = this.randomIntFromInterval(-10, 10)
        this.hotEffect = this.randomIntFromInterval(-10, 10)
    }

    public initUser(){
        while(!this.intialAnswerSet.has(this.answer)) this.answer = this.prompt("Are you already registered?: [y/n]")
        if(this.answer === 'n') this.startConnectionRegistry() // if he isnt registered, you are connected to the registry
        if(this.answer === 'y') this.startConnectionEngine() // if he is, he is connected to the registry
    }

    // alias & password ask
    public askUserInfo(){ 
        this.alias = this.prompt("Introduce your username: ")
        this.password = this.prompt("Introduce your password: ")
    }

    // clean of some properties filled before
    public clearInfo() {
        this.alias = ''
        this.password = ''
        this.answer = ''
    }

    public showMenu() {
        while(!this.menuAnswerSet.has(this.answer)){
            console.log("Menu:\n 1. Edit Profile \n 2. Join to a game \n 3. END")
            this.answer = this.prompt('')
            if (!this.menuAnswerSet.has(this.answer)) console.log('Please introduce 1,2 or 3')
        }
    }

    public startConnectionRegistry(fromEngine?: boolean) {
        this.askUserInfo()
        console.log(`Connecting to ${this.REGISTRY_HOST}:${this.REGISTRY_PORT}`) 

        const socket = new Socket() 
        socket.connect(this.REGISTRY_PORT, this.REGISTRY_HOST) 
        socket.setEncoding("utf-8")
      
        socket.on("connect", () => {
            console.log(`Connected to Registry`) 

            // if it is called from Engine it is to edit the user, if not the user wants to register
            // the authentication (login) has to be done by engine, so the registry is only used to create/edit an account
            // we send to the server the event, alias and password in both cases
            if(fromEngine){
                socket.write(`${PlayerEvents.EDIT_PROFILE}:${this.alias}:${this.password}`)
            }
            else {
                socket.write(`${PlayerEvents.SIGN_UP}:${this.alias}:${this.password}`)
            }

            socket.on("data", (data) => { // here is entered when the player receives information from registry
                if(data.toString().includes("OK")){ // if the message includes an OK it shows the menu, otherwise it is because an error has occurred and has to be handled
                    this.showMenu()
                    switch(this.answer){
                        case '1':
                            this.askUserInfo()
                            socket.write(`${PlayerEvents.EDIT_PROFILE}:${this.alias}:${this.password}`)
                            break
                        default: // if he wants to start a game, he will be disconnected from the registry and connected to the engine
                            this.endSocket(socket)
                    }
                }
                else { // handling of the error
                    const [event, _, errorMessage] = data.toString().split(':') // I create a vector of the server response, each position is splitted when it appears a : in the string
                    console.log(`[${event}]:${errorMessage}`)

                    this.endSocket(socket) // will finish the communication, but the execution will continue in socket("close... (below)
                }
            }) 
        }) 
      
        socket.on("close", () => { // when connection termination is confirmed (server response), after endSocket function 
            switch(this.answer){
                case '2': // if it has arrived here it is because the player wants to play
                    this.joinGame()
                    break
                case '3':  // if it has arrived here it is because the player wants to close the connection
                    // Client sends END, Server confirms completion, Client kills process, here we kill the client process
                    console.log("Disconnected from Registry")
                    process.exit(0) // we kill the client process
                default: // if it has arrived here it is because an error has occurred from the server, we restart the connection
                    this.clearInfo()
                    this.initUser()
            }
        }) 
    }

    public startConnectionEngine() { // function that allows connection to the server engine, only for authentication
        this.askUserInfo()
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
                    this.endSocket(socket) // in all the menu posibilities, will end the socket connection
                }
                else {
                    const [event, _, errorMessage] = data.toString().split(':') // creates a vector of the server response, each position is splitted when it appears a : in the string
                    console.log(`[${event}]:${errorMessage}`)

                    this.endSocket(socket)
                }
            }) 
        }) 
      
        socket.on("close", () => { // when connection termination is confirmed (server response), after endSocket function
            switch(this.answer){
                case '1': // if it has arrived here it is because the player wants to edit the profile
                    this.startConnectionRegistry(true)
                    break
                case '2': // if it has arrived here it is because the player wants to play
                    this.joinGame()
                case '3':  // if it has arrived here it is because the player wants to close the connection
                // Client sends END, Server confirms completion, Client kills process, here we kill the client process
                    console.log("Disconnected from Engine") 
                    process.exit(0) // we kill the client process
                default: // if it has arrived here it is because an error has occurred from the server, we restart the connection
                    this.clearInfo()
                    this.initUser()
            }
        }) 
    }

    // used in the different circumstances to finish the socket communication
    public endSocket(socket: Socket){
        socket.write(PlayerEvents.END)
        socket.end()
    }

    // starts the kafka usage
    public async joinGame() {
        const kafka = new KafkaUtil(this.alias, 'player', 'engineMessages') // it creates consumer and producer instances and is able to send messages to the corresponding topic
        this.requestToJoinLobby(kafka) // send the message to join the lobby
        console.log('Wating for the game to start...')

        try {
            // here enters to a loop and starts to consume all the messages from kafka
            await kafka.consumer.run({ 
                eachMessage: async (payload) => { // payload: raw message from kafka
                    if (payload.message.value){ // true if the value is different from undefined
                        const engineMessage: EngineStream = JSON.parse(payload.message.value.toString()) // converts the value in a JSON (kind of deserialization), Buffer -> string -> JSON
                        // only matters if engine write the alias of the player or if it is for all players
                        if (this.isEngineStreamReceiver(engineMessage)) this.processMessage(engineMessage, kafka) // process the message from kafka cluster that was sent by the engine
                        this.askMovement(kafka) // asks and send the event to the kafka cluster
                    }
                    else {
                        console.log("Error: Received a undefined message")
                    }
                }
            })
        }
        catch(e){
            // if there is an error, pause and resume message consumption
            kafka.pauseConsumer()
            kafka.resumeConsumer()

            throw e
        }
    }

    public requestToJoinLobby(kafka: KafkaUtil) {
        const event: PlayerStream = { // first message from the player to the engine in kafka to ask to join the lobby
            event: PlayerEvents.REQUEST_TO_JOIN,
            playerInfo: this.getPlayerInfo()
        }
        kafka.sendRecord(event)
    }

    // true if the message includes the alias explicitly or if it a message for all
    public isEngineStreamReceiver (engineMessage: EngineStream): boolean { 
        return engineMessage.playerAlias === this.alias || engineMessage.messageToAll === true
    }

    public printBoard(map: string[][]) {
        for (let i = 0; i < map.length; i++) { 
            console.log(map[i].join(''))
        }
    }

    public processMessage(message: EngineStream, kafka: KafkaUtil){
        switch (message.event){
            case EngineEvents.PLAYER_CONNECTED_OK:
                this.joined = true
                console.log('You have joined successfully to the lobby')

                break
            case EngineEvents.PLAYER_CONNECTED_ERROR: // when someone try to REQUEST_TO_JOIN but the game already started
                console.log(message.playerAlias, ' could not connect because: ', message.error)
                kafka.pauseConsumer()

                break
            case EngineEvents.GAME_NOT_PLAYABLE: // when someone try to send a NEW_POSITION event and the game hasnt started or already finished
                console.log(message.playerAlias, ': ', message.error)
                if (this.finishedGame) kafka.pauseConsumer()

                break

            case EngineEvents.GAME_STARTED:
                if (this.joined) { // if true is because the player was a confirmed joined player with engine
                    console.log(message.playerAlias, ': THE GAME HAS STARTED!')
                    if (message.map) this.printBoard(message.map)
                }
                else { // it could happen that the player receives this message as first one, it wont be able to join
                    console.log('Sorry the game has already started and you cant join to this session')
                    kafka.pauseConsumer()
                }

                break
            
            case EngineEvents.GAME_ENDED:
                kafka.pauseConsumer()
                this.finishedGame = true

                console.log('The game has ended')

                break
            
            case EngineEvents.DEATH:
                kafka.pauseConsumer()
                this.finishedGame = true

                console.log('You lost, someone killed you')

                break

            case EngineEvents.MOVEMENT_OK:
                if (message.event2) {
                    switch (message.event2) { // se podria eliminar este switch y direcrtamente mostrar el mapa
                        case EngineEvents.KILL:
                            if (message.map) this.printBoard(message.map)
                            // podria mostrar algun mensaje o informacion sobre el playerInfo
                            break
            
                        case EngineEvents.LEVEL_UP:
                            if (message.map) this.printBoard(message.map)
            
                            break

                        case EngineEvents.TIE:
                            if (message.position) this.position = message.position
                            if (message.map) this.printBoard(message.map)

                            break
            
                    }
                }
                if (message.map) this.printBoard(message.map)

                break

            case EngineEvents.MOVEMENT_ERROR:
                if (message.position) this.position = message.position
                if (message.map) this.printBoard(message.map)
                console.log(message.playerAlias, ': ', message.error)

                break
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

    public askMovement(kafka: KafkaUtil) {
        while(!this.movementSet.has(this.answer)){
            console.log("Introduce a movement [N, S, W, E, NW, NE, SW, SE]: ")
            this.answer = this.prompt("")
            if (!this.movementSet.has(this.answer)) console.log('Please introduce N, S, W, E, NW, NE, SW or SE')
        }

        this.changePosition()

        const event: PlayerStream = {
            event: PlayerEvents.REQUEST_TO_JOIN,
            playerInfo: this.getPlayerInfo()
        }

        kafka.sendRecord(event)
    }

    public changePosition() {
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

    // external coordinates are connected to each other
    public moveN() {
        if(this.position.x === 0) {
            this.position.x = 19
        }
        else {
            this.position.x - 1
        }
    }

    public moveS() {
        if(this.position.x === 19) {
            this.position.x = 0
        }
        else {
            this.position.x + 1
        }
    }

    public moveW() {
        if(this.position.y === 0) {
            this.position.y = 19
        }
        else {
            this.position.y - 1
        }
    }

    public moveE() {
        if(this.position.y === 19) {
            this.position.y = 0
        }
        else {
            this.position.y + 1
        }
    }

    public moveNW() {
        if(this.position.x === 0) {
            this.position.x = 19
        }
        else {
            this.position.x - 1
        }
        if(this.position.y === 0) {
            this.position.y = 19
        }
        else {
            this.position.y - 1
        }
    }

    public moveNE() {
        if(this.position.x === 19) {
            this.position.x = 0
        }
        else {
            this.position.x + 1
        }
        if(this.position.y === 19) {
            this.position.y = 0
        }
        else {
            this.position.y + 1
        }
    }

    public moveSW() {
        if(this.position.x === 19) {
            this.position.x = 0
        }
        else {
            this.position.x + 1
        }
        if(this.position.y === 0) {
            this.position.y = 19
        }
        else {
            this.position.y - 1
        }
    }

    public moveSE() {
        if(this.position.x === 0) {
            this.position.x = 19
        }
        else {
            this.position.x - 1
        }
        if(this.position.y === 19) {
            this.position.y = 0
        }
        else {
            this.position.y + 1
        }
    }

    public modifyLevel(amount: number) {
        this.baseLevel += amount
    }

    public randomIntFromInterval(min: number, max: number) { // min and max included 
        return Math.floor(Math.random() * (max - min + 1) + min)
    }
}

function main() {
    const ENGINE_SERVER_HOST = config.ENGINE_SERVER_HOST || "localhost" // aqui se escribira la ip del ordenador donde este lanzado el server (engine & registry), pero si lo haces todo desde el mismo pc en diferentes terminales es localhost
    const ENGINE_SERVER_PORT = Number(config.ENGINE_SERVER_PORT) || 5670

    const REGISTRY_SERVER_HOST = config.REGISTRY_SERVER_HOST || "localhost"
    const REGISTRY_SERVER_PORT = Number(config.REGISTRY_SERVER_PORT) || 6579

    const KAFKA_HOST = config.KAFKA_HOST || "localhost"
    const KAFKA_PORT = Number(config.KAFKA_PORT) || 9092 // docker-compose (KAFKA_LISTENERS)

    const player = new Player(ENGINE_SERVER_HOST, ENGINE_SERVER_PORT, REGISTRY_SERVER_HOST, REGISTRY_SERVER_PORT, KAFKA_HOST, KAFKA_PORT)
    player.initUser()
}

main()