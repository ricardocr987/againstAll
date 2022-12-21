import { PlayerEvents, RegistryEvents, RegistryPlayerInfo, PlayerInfo, PlayerStream, EngineEvents, Coordinate } from './types.js'
import { GameBoard } from './board.js'
import { paths } from './utils/utils.js'
import { KafkaUtil } from './utils/kafka.js'
import { config } from './utils/config.js'
import apiController from './utils/apiController.js'
import { Server, Socket } from 'net'
import { existsSync, readFileSync } from 'fs'
import { v4 as uuid } from 'uuid'
import axios from 'axios'

export class EngineServer {
    // RECORD MAPS
    public registeredPlayers: Record<string, RegistryPlayerInfo> = this.getPlayers() // map to store the registry related player's information where the key is the alias and the value is the player instance, gets data from DB
    public playerSockets: Record<string, Socket> = {} // map to store the socket information being the key the player alias and the value the socket instance, only works to close the server when there are no players
    public connectedPlayers: Record<string, PlayerInfo> = {} // map to store the player information being the key the player alias and the value the playerInfo
    public cityInfo: Record<string, number> = {} // key: name of the city, value: weather info

    // FLAGS
    public gameFinished: boolean = false
    
    // GAME MAPS
    public gameBoard: GameBoard = new GameBoard()
    public temperatureBoard: GameBoard = new GameBoard()
    public cities: string[] = config.CITIES?.split(',') || ['Napoles', 'London', 'Prague', 'Liverpool']
    
    public io: Server = new Server() // server instance

    public authenticatedPlayers = 0
    public timestamp: number = Date.now() // used as a security check to only read messages after this timestamp
    public messagesRead: string[] = [] // used as a security check to only read each message only once

    public gameIdApi: string = ''
    constructor(        
        public SERVER_PORT: number,

        public KAFKA_HOST: string,
        public KAFKA_PORT: number,

        public MAX_PLAYERS: number,
    ) {}

    /* ------------------------------------ PLAYER METHODS ------------------------------------ */

    public getPlayers(): Record<string, RegistryPlayerInfo> { // when an object is created read the json to load data from old executions
        if(!existsSync(paths.dataDir) || !existsSync(paths.dataFile('registry'))) return {}

        const registeredPlayers: Record<string, RegistryPlayerInfo> = {}
        const players: Record<string, RegistryPlayerInfo> = JSON.parse(readFileSync(paths.dataFile('registry'), 'utf8')) // read the file
        for(const player of Object.values(players)){ // loop to save all the players that had been stored in the file to the map
            registeredPlayers[player.alias] = player
        }

        return registeredPlayers
    }

    public signInPlayer(player: RegistryPlayerInfo, socket: Socket) {
        this.registeredPlayers = this.getPlayers() // necessary to have it fully updated at this point
        if(!this.registeredPlayers[player.alias]) throw new Error('This alias does not exist on the database')
        if(this.registeredPlayers[player.alias].password !== player.password) throw new Error('The password is not correct')
        
        socket.write(RegistryEvents.SIGN_IN_OK)
        this.authenticatedPlayers++
    }

    public async initilizePlayerInfo(playerInfo: PlayerInfo) {
        console.log(playerInfo)
        this.connectedPlayers[playerInfo.alias] = playerInfo
        this.gameBoard.modifyBoard(playerInfo.alias, playerInfo.position)

        const map = this.gameBoard.matrixToVector()
        const apiResponse = await apiController.updateGame(this.gameIdApi, { map })
        console.log(`API Response status: ${apiResponse.status}, message: ${apiResponse.message}`)

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

    /* ------------------------------------ GAME METHODS ------------------------------------ */

    public startAuthentication() {
        this.io.on('connection', (socket: Socket) => {
            const remoteSocket = `${socket.remoteAddress}:${socket.remotePort}` // IP + client port
            console.log(`New connection from ${remoteSocket}`)
            socket.setEncoding('utf-8') // sets the kind of encoding format

            socket.on('data', (message) => { // // when you send a message from the client, (socket.write) -> you receive a Buffer (bytes) that must be converted into a string .toString()
                const [event, alias, password] = message.toString().split(':') // message received from the player
                
                if (!this.playerSockets[alias]) this.playerSockets[alias] = socket // if it isnt registered already as a connected socket will register it

                console.log(`Received this message from the player: ${event}:${alias}:${password}`)

                // stores player info
                const registryPlayerInfo: RegistryPlayerInfo = {
                    id: '',
                    alias: alias,
                    password: password
                }

                // depending of the message event from the player, will try to check the credentials to log in or end the connection
                switch(event){
                    case PlayerEvents.SIGN_IN:
                        try{
                            if (this.MAX_PLAYERS === this.authenticatedPlayers) {
                                socket.write(`${RegistryEvents.SIGN_IN_ERROR}:NO_SPACE`)
                            }
                            else {
                                this.signInPlayer(registryPlayerInfo, socket) 
                            }
                        } catch(e){
                            socket.write(`${RegistryEvents.SIGN_IN_ERROR}:${e}`)
                        }
                        break

                    case PlayerEvents.END: // if it receives END event, will finish the connection
                        console.log('SOCKET DISCONNECTED: ' + remoteSocket)
                        if (this.playerSockets[alias]) delete this.playerSockets[alias]
                        socket.end()
                        // if (Object.values(this.playerSockets).length == 0) process.exit(0) // mata proceso en caso de que no haya conexiones
                        break
                }          
            }) 
        })

        this.io.listen(this.SERVER_PORT) // the server listens the port
    }

    public async newGame() {
        await this.getWeatherInfo()

        const kafka = new KafkaUtil('server', 'engine', 'playerMessages') // it creates consumer and producer instances and is able to send messages to the corresponding topic
        await kafka.producer.connect()
        await kafka.consumer.connect()
        await kafka.consumer.subscribe({ topic: 'playerMessages' })

        if (!this.gameBoard.filledBoard) {
            this.gameBoard.fillBoard()
            const map = this.gameBoard.matrixToVector()
            const apiResponse = await apiController.createGame({map})
            console.log(`API Response status: ${apiResponse.status}, message: ${apiResponse.message}`)
            this.gameIdApi = apiResponse.data.id
        }

        await kafka.sendRecord({ // and send to all players a record notifing them that the game has just started
            id: uuid(),
            event: EngineEvents.GAME_STARTED,
            messageToAll: true,
            map: this.gameBoard.board
        })
        console.log('THE GAME HAS STARTED!')

        try {
            await kafka.consumer.run({ 
                eachMessage: async (payload) => { // payload: raw message from kafka
                    if (Number(payload.message.timestamp) > this.timestamp) {
                        if (payload.message.value){ // true if message is != undefined
                            const playerMessage: PlayerStream = JSON.parse(payload.message.value.toString()) // I convert the message value into a JSON (it would be like a kind of deserialization), Buffer -> string -> JSON
                            console.log(playerMessage)
                            if (!this.messagesRead.includes(playerMessage.id)) { // i want to make sure all the messages are read only one time
                                await this.processMessage(playerMessage, kafka) // process the received message, sends answers and updates map
                                this.messagesRead.push(playerMessage.id)
                            }
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
    public async processMessage(message: PlayerStream, kafka: KafkaUtil){
        switch (message.event){
            case PlayerEvents.INITIAL_MESSAGE: 
                await this.initilizePlayerInfo(message.playerInfo) // if the player hasnt been registered his ingame info, it is initilized        
                break

            case PlayerEvents.NEW_POSITION:
                if (this.gameFinished) {
                    await kafka.sendRecord({
                        id: uuid(),
                        event: EngineEvents.GAME_NOT_PLAYABLE,
                        playerAlias: `${message.playerInfo.alias}`,
                        error: 'game not playable now (not started/finished)'
                    })
                }
                else {
                    if (this.connectedPlayers[message.playerInfo.alias]) await this.updateBoard(message.playerInfo, kafka)
                }
                break
        }
        this.gameBoard.printBoard()
    }

    public async updateBoard(playerInfo: PlayerInfo, kafka: KafkaUtil) {
        const previousPosition = this.connectedPlayers[playerInfo.alias].position // stores the previous position, to delete the player there
        this.gameBoard.modifyBoard(' ', previousPosition) // deletes the player from the previous coordinate he was (empyting the coordinate)

        const newPosition = playerInfo.position // stores the new position that maybe the player will be
        const newPositionContent = this.gameBoard.board[newPosition.x][newPosition.y]

        switch (newPositionContent) {
            case 'M': // mine, the player die and disappears from the board/map (because was previously deleted from his last position) and also is deleted in connectedPlayers map
                await kafka.sendRecord({
                    id: uuid(),
                    event: EngineEvents.DEATH,
                    playerAlias: playerInfo.alias,
                    map: this.gameBoard.board
                })
                delete this.connectedPlayers[playerInfo.alias]
                this.gameBoard.modifyBoard(' ', newPosition)

                break

            case 'A': // food, levels up in the players info map and sends the event to the player
                this.gameBoard.modifyBoard(playerInfo.alias, newPosition)
                this.connectedPlayers[playerInfo.alias].position = newPosition
                this.connectedPlayers[playerInfo.alias].baseLevel++

                await kafka.sendRecord({
                    id: uuid(),
                    event: EngineEvents.MOVEMENT_OK,
                    event2: EngineEvents.LEVEL_UP,
                    playerAlias: playerInfo.alias,
                    map: this.gameBoard.board
                })

                break
            
            case ' ': // coordinate free
                this.gameBoard.modifyBoard(playerInfo.alias, newPosition) // position updated in the game map/board
                this.connectedPlayers[playerInfo.alias].position = newPosition

                await kafka.sendRecord({
                    id: uuid(),
                    event: EngineEvents.MOVEMENT_OK,
                    playerAlias: playerInfo.alias,
                    map: this.gameBoard.board
                })

                break

            default: // player or npc
                if (this.connectedPlayers[newPositionContent]) await this.decideWinner(playerInfo, this.connectedPlayers[newPositionContent], kafka, previousPosition, newPosition)
        }
        const map = this.gameBoard.matrixToVector()
        const apiResponse = await apiController.updateGame(this.gameIdApi, {map})
        console.log(`API Response status: ${apiResponse.status}, message: ${apiResponse.message}`)
    }

    // manages the process for deciding who wins the match, also handles the sending of the correspondings messages
    public async decideWinner (actualPlayer: PlayerInfo, attackedPlayer: PlayerInfo, kafka: KafkaUtil, previousPosition: Coordinate, newPosition: Coordinate) {
        const temperature = this.getCityTemperature(newPosition)
        const [actualPlayerLevel, attackedPlayerLevel] = this.getPlayersLevel(temperature, actualPlayer, attackedPlayer)
        
        if (actualPlayerLevel > attackedPlayerLevel) {
            // WINNER
            this.gameBoard.modifyBoard(actualPlayer.alias, newPosition) // position updated in the game map/board

            await kafka.sendRecord({
                id: uuid(),
                event: EngineEvents.MOVEMENT_OK,
                event2: EngineEvents.KILL,
                playerAlias: actualPlayer.alias,
                map: this.gameBoard.board
            })

            // LOSER
            delete this.connectedPlayers[attackedPlayer.alias]

            await kafka.sendRecord({
                id: uuid(),
                event: EngineEvents.DEATH,
                playerAlias: attackedPlayer.alias
            })
        }
        else {
            if (actualPlayerLevel < attackedPlayerLevel) {
                // WINNER:
                await kafka.sendRecord({
                    id: uuid(),
                    event: EngineEvents.KILL,
                    playerAlias: attackedPlayer.alias
                })

                // LOSER
                delete this.connectedPlayers[actualPlayer.alias]

                await kafka.sendRecord({
                    id: uuid(),
                    event: EngineEvents.DEATH,
                    playerAlias: actualPlayer.alias
                })
            }
            else { // tie, ie: same level both
                this.gameBoard.modifyBoard(actualPlayer.alias, previousPosition) // position updated in the game map/board

                await kafka.sendRecord({
                    id: uuid(),
                    event: EngineEvents.MOVEMENT_OK,
                    event2: EngineEvents.TIE,
                    map: this.gameBoard.board,
                    position: previousPosition
                })
            }
        }
    }

    /* ------------------------------------ WEATHER METHODS ------------------------------------ */

    public async getWeatherInfo(){
        for(const city of this.cities) {
            try {
                // Define the API endpoint
                const response = await axios.get(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${config.API_KEY_WEATHER}`)
                this.cityInfo[city] = (response.data.main.temp - 273.15)
            } catch (error) {
                console.error(error)
            }
        }
        this.temperatureBoard.fillCitiesBoard(this.cityInfo, this.cities)
    }

    public getCityTemperature(position: Coordinate): number {
        return Number(this.temperatureBoard.board[position.x][position.y])
    }
}

function main() {
    const ENGINE_SERVER_PORT = Number(config.ENGINE_SERVER_PORT) || 5886
    const KAFKA_HOST = config.KAFKA_HOST || 'localhost'
    const KAFKA_PORT = Number(config.KAFKA_PORT) || 9092 // docker-compose
    const MAX_PLAYERS = Number(config.MAX_PLAYERS) || 5

    const engine = new EngineServer(ENGINE_SERVER_PORT, KAFKA_HOST, KAFKA_PORT, MAX_PLAYERS)
    engine.startAuthentication()

    setTimeout(() => {
        engine.io.close()
        setTimeout(async () => {
            await engine.newGame()
        }, 5000)
    }, 15000)
}

main()