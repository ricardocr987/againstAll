import { Server, Socket } from 'net'
import { Paths } from './paths.js'
import { existsSync, readFileSync } from 'fs'
import { PlayerEvents, RegistryEvents, RegistryPlayerInfo, PlayerInfo, PlayerStream, EngineEvents, Coordinate } from './types.js'
import { KafkaUtil } from './kafka.js'
import { config } from './config.js'

export class EngineServer {
    public paths: Paths = new Paths(`./`) // is simply an object to make it easy to get the path to e.g. the database
    
    public io: Server // server instance
    public authenticatedPlayers = 0

    // MAPS
    public registeredPlayers: Record<string, RegistryPlayerInfo> = this.getPlayers() // map to store the registry related player's information where the key is the alias and the value is the player instance, gets data from DB
    public playerSockets: Record<string, Socket> = {} // map to store the socket information being the key the player alias and the value the socket instance, only works to close the server when there are no players
    public connectedPlayers: Record<string, PlayerInfo> = {} // map to store the player information being the key the player alias and the value the playerInfo
    public connectedNPCs: Record<string, PlayerInfo> = {} // same as connectedPlayers but with NPCs
    public cityNames: string[] = [] // storing the 4 city names
    public cityInfo: Record<string, number> = {} // key: name of the city, value: weather info

    // FLAGS
    public gameStarted: boolean = false
    public gameFinished: boolean = false
    public filledMap: boolean = false
    
    public map: string[][] // stores the game map
    public cityMap: string[][] // stores the city names, each position has its corresponding city name

    constructor(        
        public SERVER_PORT: number,

        public KAFKA_HOST: string,
        public KAFKA_PORT: number,

        public WEATHER_HOST: string,
        public WEATHER_PORT: number,

        public MAX_PLAYERS: number,
    ) {
        this.io = new Server()
        this.map = this.getEmptyMap()
        this.cityMap = this.getEmptyMap()
    }

    public getEmptyMap(): string[][] {
        const map: string[][] = []

        for (let i = 0; i < 20; i++) { 
            map.push([' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ',]) // row
        }

        return map
    }

    public printBoard() {
        console.table(this.map)
    }

    public printCityBoard() {
        console.table(this.cityMap)
    }

    // it overrides the content of a position by introducing the new content 
    public modifyCityBoard(toIntroduce: string, position: Coordinate) { 
        this.cityMap[position.x][position.y] = toIntroduce // modifies the content of the map 
    }

    public getPlayers(): Record<string, RegistryPlayerInfo> { // when an object is created read the json to load data from old executions
        if(!existsSync(this.paths.dataDir)) return {}

        const registeredPlayers: Record<string, RegistryPlayerInfo> = {}
        const players: Record<string, RegistryPlayerInfo> = JSON.parse(readFileSync(this.paths.dataFile("registry"), "utf8")) // read the file
        for(const player of Object.values(players)){ // loop to save all the players that had been stored in the file to the map
            registeredPlayers[player.alias] = player
        }

        return registeredPlayers
    }

    public signInPlayer(player: RegistryPlayerInfo, socket: Socket) {
        this.registeredPlayers = this.getPlayers() // necessary to have it fully updated at this point
        if(!this.registeredPlayers[player.alias]) throw new Error("This alias does not exist on the database")
        if(this.registeredPlayers[player.alias].password !== player.password) throw new Error("The password is not correct")
        
        socket.write(RegistryEvents.SIGN_IN_OK)
        this.authenticatedPlayers++
    }

    public startAuthentication() {
        this.io.on('connection', (socket: Socket) => {
            const remoteSocket = `${socket.remoteAddress}:${socket.remotePort}` // IP + client port
            console.log(`New connection from ${remoteSocket}`)
            socket.setEncoding("utf-8") // sets the kind of encoding format

            socket.on("data", (message) => { // // when you send a message from the client, (socket.write) -> you receive a Buffer (bytes) that must be converted into a string .toString()
                const [event, alias, password] = message.toString().split(':') // message received from the player
                
                if (!this.playerSockets[alias]) this.playerSockets[alias] = socket // if it isnt registered already as a connected socket will register it
                console.log(`Received this message from the player: ${event}:${alias}:${password}`)

                // stores player info
                const registryPlayerInfo: RegistryPlayerInfo = {
                    alias,
                    password
                }

                // depending of the message event from the player, will try to check the credentials to log in or end the connection
                switch(event){
                    case PlayerEvents.SIGN_IN:
                        try{
                            this.signInPlayer(registryPlayerInfo, socket) 
                        } catch(e){
                            socket.write(`${RegistryEvents.SIGN_IN_ERROR}:${e}`)
                        }
                        break

                    case PlayerEvents.END: // if it receives END event, will finish the connection
                        console.log("SOCKET DISCONNECTED: " + remoteSocket)
                        if (this.playerSockets[alias]) delete this.playerSockets[alias]
                        socket.end()
                        // if (Object.values(this.playerSockets).length == 0) process.exit(0) // mata proceso en caso de que no haya conexiones
                        break
                }          
            }) 
        })

        if (this.MAX_PLAYERS === this.authenticatedPlayers) this.io.close // if it reaches the maximum players closes the server and starts using kafka

        this.io.listen(this.SERVER_PORT) // the server listens the port
    }

    public async newGame() {
        const kafka = new KafkaUtil('server', 'engine', 'playerMessages')
        await kafka.producer.connect()
        await kafka.consumer.connect()
        await kafka.consumer.subscribe({ topic: 'playerMessages', fromBeginning: true })

        try {
            await kafka.consumer.run({ 
                eachMessage: async (payload) => { // payload: raw message from kafka
                    if (payload.message.value){ // true if message is != undefined
                        const playerMessage: PlayerStream = JSON.parse(payload.message.value.toString()) // I convert the message value into a JSON (it would be like a kind of deserialization), Buffer -> string -> JSON
                        this.processMessage(playerMessage, kafka) // process the received message, sends answers and updates map
                        if (!this.gameStarted) { // in the case the game hasnt started...
                            this.gameStarted = true // ...starts the game...
                            kafka.sendRecord({ // and send to all players a record notifing them that the game has just started
                                event: EngineEvents.GAME_STARTED,
                                messageToAll: true
                            })
                            console.log("THE GAME HAS STARTED!")
                        }
                        else {
                            if (!this.filledMap) this.fillMap()
                        }
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
        // cuando se inicia partida se deberia cerrar el socket que permite la autenticacion o activar un booleano que no permita unirse a la partida cuando esta este activada
        // desarrollar un timeout de la partida que la termine cuando el contador sea 0, gana el que mas nivel tiene
    }

    /* 
        Engine only receives two kind of events:
        - REQUEST_TO_JOIN: 
            - If the game hasnt started, enables the player to join it, sending a record notifying that he has joined
            - If not, sends a record notifying that he cant join
        - NEW_POSITION:
            - If the game hasnt started or already finished, sends GAME_NOT_PLAYABLE, here the player to move without the game being ready
            - Else, the position of the player have to be modified in the board and is needed to send a record about the player's situation after this event
    */
    public processMessage(message: PlayerStream, kafka: KafkaUtil){
        switch (message.event){
            case PlayerEvents.REQUEST_TO_JOIN:
                if (!this.gameStarted) {
                    if(message.playerInfo.alias.includes('NPC')) {
                        this.connectedNPCs[message.playerInfo.alias] = message.playerInfo
                    }
                    else{
                        this.connectedPlayers[message.playerInfo.alias] = message.playerInfo
                    }
                    this.modifyBoard(message.playerInfo.alias, message.playerInfo.position)
    
                    kafka.sendRecord({
                        event: EngineEvents.PLAYER_CONNECTED_OK,
                        playerAlias: `${message.playerInfo.alias}`
                    })
                    console.log(`Player ${message.playerInfo.alias} connected to the lobby`)
                }
                else {
                    kafka.sendRecord({
                        event: EngineEvents.PLAYER_CONNECTED_ERROR,
                        playerAlias: `${message.playerInfo.alias}`,
                        error: 'game already started'
                    })
                }
                break
            case PlayerEvents.NEW_POSITION:
                if (!this.gameStarted || this.gameFinished) {
                    kafka.sendRecord({
                        event: EngineEvents.GAME_NOT_PLAYABLE,
                        playerAlias: `${message.playerInfo.alias}`,
                        error: 'game not playable now (not started/finished)'
                    })
                }
                else {
                    this.updateBoard(message.playerInfo, kafka)
                }
        }
    }

    // it overrides the content of a position by introducing the new content 
    public modifyBoard(toIntroduce: string, position: Coordinate) { 
        this.map[position.x][position.y] = toIntroduce // modifies the content of the map 
        if (this.connectedPlayers[toIntroduce]) this.connectedPlayers[toIntroduce].position = position // if the string is the player alias, also changes his position
        // position updated in the playersInfo map
    }

    public updateBoard(playerInfo: PlayerInfo, kafka: KafkaUtil) {
        const previousPosition = this.connectedPlayers[playerInfo.alias].position // stores the previous position, to delete the player there
        this.modifyBoard(' ', previousPosition) // deletes the player from the previous coordinate he was (empyting the coordinate)

        const newPosition = playerInfo.position // stores the new position that maybe the player will be
        const newPositionContent = this.map[newPosition.x][newPosition.y]

        if(newPositionContent !== ' ') { // if that coordinate was already occupied, we need to manage the situation
            switch (newPositionContent) {
                case 'M': // mine, the player die and disappears from the board/map (because was previously deleted from his last position) and also is deleted in connectedPlayers map
                    kafka.sendRecord({
                        event: EngineEvents.MOVEMENT_OK,
                        event2: EngineEvents.DEATH,
                        playerAlias: playerInfo.alias,
                    })
                    delete this.connectedPlayers[playerInfo.alias]

                    break
                case 'A': // food, levels up in the players info map and sends the event to the player
                    this.modifyBoard(playerInfo.alias, newPosition)
                    kafka.sendRecord({
                        event: EngineEvents.MOVEMENT_OK,
                        event2: EngineEvents.LEVEL_UP,
                        playerAlias: playerInfo.alias,
                        map: this.map
                    })
                    this.connectedPlayers[playerInfo.alias].baseLevel++

                    break
                default:
                    if (this.connectedPlayers[newPositionContent]) { // if it is a player
                        this.decideWinner(playerInfo, this.connectedPlayers[newPositionContent], kafka, previousPosition, newPosition)
                    }
                    else { // if it is a NPC

                    }
            }
        }
        else { // if it was free, it isnt needed to manage the situation
            this.modifyBoard(playerInfo.alias, newPosition) // position updated in the game map/board

            kafka.sendRecord({
                event: EngineEvents.MOVEMENT_OK,
                playerAlias: playerInfo.alias
            })
        }
    }

    // manages the process for deciding who wins the match, also handles the sending of the correspondings messages
    public decideWinner (actualPlayer: PlayerInfo, attackedPlayer: PlayerInfo, kafka: KafkaUtil, previousPosition: Coordinate, newPosition: Coordinate) {
        const temperature = this.getCityTemperature(newPosition)
        const [actualPlayerLevel, attackedPlayerLevel] = this.getPlayersLevel(temperature, actualPlayer, attackedPlayer)
        if (actualPlayerLevel > attackedPlayerLevel) {
            // WINNER
            this.modifyBoard(actualPlayer.alias, newPosition) // position updated in the game map/board

            kafka.sendRecord({
                event: EngineEvents.MOVEMENT_OK,
                event2: EngineEvents.KILL,
                playerAlias: actualPlayer.alias
            })

            // LOSER
            delete this.connectedPlayers[attackedPlayer.alias]

            kafka.sendRecord({
                event: EngineEvents.DEATH,
                playerAlias: attackedPlayer.alias
            })
        }
        else {
            if (actualPlayerLevel < attackedPlayerLevel) {
                // WINNER: doesnt need to be modified
                // LOSER
                delete this.connectedPlayers[attackedPlayer.alias]

                kafka.sendRecord({
                    event: EngineEvents.DEATH,
                    playerAlias: attackedPlayer.alias
                })
            }
            else { // tie, ie: same level both
                this.modifyBoard(actualPlayer.alias, previousPosition) // position updated in the game map/board

                kafka.sendRecord({
                    event: EngineEvents.MOVEMENT_OK,
                    event2: EngineEvents.TIE,
                    map: this.map,
                    position: previousPosition
                })
            }
        }
    }

    public getCityTemperature(position: Coordinate): number {
        const name = this.cityMap[position.x][position.y]
        return this.cityInfo[name]
    }

    public getPlayersLevel(cityTemperature: number, actualPlayer: PlayerInfo, attackedPlayer: PlayerInfo): number[] {
        if (cityTemperature < 10) {
            return [actualPlayer.baseLevel + actualPlayer.coldEffect, attackedPlayer.baseLevel + attackedPlayer.coldEffect]
        }
        else {
            if (cityTemperature > 25) {
                return [actualPlayer.baseLevel + actualPlayer.hotEffect, attackedPlayer.baseLevel + attackedPlayer.hotEffect]
            }
            else {
                return [actualPlayer.baseLevel, attackedPlayer.baseLevel]
            }
        }
    }

    // fill map with mines and food
    public fillMap () {
        const minesNumber = this.randomIntFromInterval(0,19) // random number between 1-20
        const foodNumber = this.randomIntFromInterval(0,19)

        for (let i = 0; i < minesNumber; i++) {
            const position = this.getFreeRandomPosition()
            this.modifyBoard('M', position)
        }

        for (let i = 0; i < foodNumber; i++) {
            const position = this.getFreeRandomPosition()
            this.modifyBoard('A', position)
        }

        this.filledMap = true
    }

    // returns always a free coordinate
    public getFreeRandomPosition (): Coordinate {
        let position = {
            x: this.randomIntFromInterval(0,19),
            y: this.randomIntFromInterval(0,19) 
        }

        while(true) {
            if (this.map[position.x][position.y] === ' ') break
            position = {
                x: this.randomIntFromInterval(0,19),
                y: this.randomIntFromInterval(0,19)
            }
        }

        return position
    }

    public randomIntFromInterval(min: number, max: number) { // min and max included 
        return Math.floor(Math.random() * (max - min + 1) + min)
    }

    public delay(ms: number) {
        return new Promise( resolve => setTimeout(resolve, ms) );
    }

    public getCitiesInfo() {
        console.log(`Connecting to ${this.WEATHER_HOST}:${this.WEATHER_PORT}`) 

        const socket = new Socket() 
        socket.connect(this.WEATHER_PORT, this.WEATHER_HOST) 
        socket.setEncoding("utf-8")

        let requestId = 0

        socket.on("connect", () => {
            console.log(`Connected to Weather`) 

            socket.write(`${EngineEvents.GET_CITY_INFO}`)
            console.log('Doing a city info request')

            socket.on("data", (data) => { // here is entered when the engine receives information from weather server
                const [_, name, temperature] = data.toString().split(':')
                console.log(`received: ${name} ${temperature}`)
                this.cityInfo[name] = Number(temperature)
                this.cityNames.push(name)
                requestId++

                if(requestId < 4) {
                    socket.write(`${EngineEvents.GET_CITY_INFO}`)
                    console.log('Doing a city info request')
                }
                else {
                    this.fillCitiesMap()
                    socket.end() 
                }
            }) 
        })
    }

    public fillCitiesMap () {
        for (let i = 0; i < 20; i++) {
            if (i < 10) {
                for(let j = 0; j < 20; j++) {
                    if (j < 10) {
                        this.modifyCityBoard(this.cityNames[0], { x: i, y: j })
                    }
                    else {
                        this.modifyCityBoard(this.cityNames[1], { x: i, y: j })
                    }
                }
            }
            else {
                for(let j = 0; j < 20; j++) {
                    if (j < 10) {
                        this.modifyCityBoard(this.cityNames[2], { x: i, y: j })
                    }
                    else {
                        this.modifyCityBoard(this.cityNames[3], { x: i, y: j })
                    }
                }
            }
        }
        this.printCityBoard()
    }
}

function main() {
    const ENGINE_SERVER_PORT = Number(config.ENGINE_SERVER_PORT) || 5886

    const KAFKA_HOST = config.KAFKA_HOST || "localhost"
    const KAFKA_PORT = Number(config.KAFKA_PORT) || 9092 // docker-compose

    const WEATHER_SERVER_HOST = config.WEATHER_SERVER_HOST || "localhost"
    const WEATHER_SERVER_PORT = Number(config.WEATHER_SERVER_PORT) || 5366

    const MAX_PLAYERS = Number(config.MAX_PLAYERS) || 5

    const engine = new EngineServer(ENGINE_SERVER_PORT, KAFKA_HOST, KAFKA_PORT, WEATHER_SERVER_HOST, WEATHER_SERVER_PORT, MAX_PLAYERS)
    engine.startAuthentication()
    
    setTimeout(() => {
        engine.io.close()
        engine.getCitiesInfo()
        setTimeout(async () => {
            await engine.newGame()
        }, 10000)
    }, 40000)
}

main()