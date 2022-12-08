import { PlayerEvents, PlayerInfo, EngineStream, EngineEvents } from './types.js'
import { randomIntFromInterval } from './utils.js'
import { GameBoard } from './board.js'
import { KafkaUtil } from './kafka.js'
import { v4 as uuid } from 'uuid'

// aggregates same functionalities for players and NPCs
export abstract class CommonPlayer {
    // PlayerInfo
    public playerInfo: PlayerInfo

    public timestamp: number = Date.now()
    public messagesRead: string[] = []

    // Flags to identify the phase of the game
    public startedGame = false
    public finishedGame = false

    public gameBoard: GameBoard = new GameBoard()

    constructor(
        public KAFKA_HOST: string,
        public KAFKA_PORT: number,
    ) {
        this.playerInfo = {
            alias: 'NPC', // initilized like this, if it is a Player will be overwritten
            position: {
                x: randomIntFromInterval(0, 19), // 0-19
                y: randomIntFromInterval(0, 19) // 0-19
            },
            baseLevel: 1,
            coldEffect: randomIntFromInterval(-10, 10),
            hotEffect: randomIntFromInterval(-10, 10),
        }
        console.log('Player Info: ', this.playerInfo)
    }

    // starts the kafka usage
    public async joinGame() {
        const kafka = new KafkaUtil(this.playerInfo.alias, 'player', 'engineMessages') // it creates consumer and producer instances and is able to send messages to the corresponding topic
        await kafka.producer.connect()
        await kafka.consumer.connect()
        await kafka.consumer.subscribe({ topic: 'engineMessages' })

        await kafka.sendRecord({
            id: uuid(),
            event: PlayerEvents.INITIAL_MESSAGE,
            playerInfo: this.playerInfo
        })
        
        console.log('Wating for the game to start...')

        try {
            // here enters to a loop and starts to consume all the messages from kafka
            await kafka.consumer.run({ 
                eachMessage: async (payload) => { // payload: raw message from kafka
                    if (Number(payload.message.timestamp) > this.timestamp) {
                        if (payload.message.value){ // true if the value is different from undefined
                            const engineMessage: EngineStream = JSON.parse(payload.message.value.toString()) // converts the value in a JSON (kind of deserialization), Buffer -> string -> JSON
                            // i want to make sure all the messages are read only one time
                            if (!this.messagesRead.includes(engineMessage.id) && this.isEngineStreamReceiver(engineMessage)) { // only matters if engine write the alias of the player or if it is for all players
                                //console.log(engineMessage)
                                if (this.startedGame) {
                                    await this.processMessage(engineMessage) // process the message from kafka cluster that was sent by the engine
                                }
                                else {
                                    if (engineMessage.event === EngineEvents.GAME_STARTED) {
                                        // we will process the kafka messages after receiving this event from the engine
                                        this.startedGame = true
                                        console.log('THE GAME HAS JUST STARTED')
                                        if (engineMessage.map) {
                                            this.gameBoard.setBoard(engineMessage.map)
                                            this.gameBoard.modifyBoard(this.playerInfo.alias, this.playerInfo.position)
                                        } 
                                    }
                                }
                                this.messagesRead.push(engineMessage.id)
                                this.gameBoard.printBoard()
                                await this.newMomevent(kafka) // asks and send the event to the kafka cluster
                            }
                        }
                        else {
                            console.log('Error: Received a undefined message')
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
    }

    abstract newMomevent(kafka: KafkaUtil): void | Promise<void>

    // true if the message includes the alias explicitly or if it a message for all
    public isEngineStreamReceiver (engineMessage: EngineStream): boolean { 
        return engineMessage.playerAlias === this.playerInfo.alias || engineMessage.messageToAll === true
    }

    public async processMessage(message: EngineStream){
        switch (message.event){

            case EngineEvents.GAME_NOT_PLAYABLE: // when someone try to send a NEW_POSITION event and the game hasnt started or already finished
                console.log(message.playerAlias, ': ', message.error)
                process.exit(0)
            
            case EngineEvents.GAME_ENDED:
                this.finishedGame = true
                console.log('The game has ended')
                process.exit(0)
            
            case EngineEvents.DEATH:
                this.finishedGame = true
                console.log('You lost, someone or a mine killed you')
                process.exit(0)

            case EngineEvents.MOVEMENT_OK:
                if (message.event2) {
                    switch (message.event2) { // se podria eliminar este switch y direcrtamente mostrar el mapa
                        case EngineEvents.KILL:
                            console.log('You killed someone')

                            break
            
                        case EngineEvents.LEVEL_UP:
                            this.playerInfo.baseLevel++

                            break

                        case EngineEvents.TIE:
                            if (message.position) this.playerInfo.position = message.position

                            break
            
                    }
                }
                
                break

            case EngineEvents.MOVEMENT_ERROR:
                if (message.position) this.playerInfo.position = message.position
                console.log(message.playerAlias, ': ', message.error)

                break
        }

        if(message.map) this.gameBoard.setBoard(message.map)
    }

    public changePosition(answer: string) {
        switch(answer){
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
        this.playerInfo.position.x--
        if (this.playerInfo.position.x < 0) this.playerInfo.position.x = 19
    }

    public moveS() {
        this.playerInfo.position.x++
        if (this.playerInfo.position.x > 19) this.playerInfo.position.x = 0
    }

    public moveW() {
        this.playerInfo.position.y--
        if (this.playerInfo.position.y < 0) this.playerInfo.position.y = 19
    }

    public moveE() {
        this.playerInfo.position.y++
        if (this.playerInfo.position.y > 19) this.playerInfo.position.y = 0
    }

    public moveNW() {
        this.playerInfo.position.x--
        if (this.playerInfo.position.x < 0) this.playerInfo.position.x = 19
        
        this.playerInfo.position.y--
        if (this.playerInfo.position.y < 0) this.playerInfo.position.y = 19
    }

    public moveNE() {
        this.playerInfo.position.x--
        if (this.playerInfo.position.x < 0) this.playerInfo.position.x = 19

        this.playerInfo.position.y++
        if (this.playerInfo.position.y > 19) this.playerInfo.position.y = 0
    }

    public moveSW() {
        this.playerInfo.position.x++
        if (this.playerInfo.position.x > 19) this.playerInfo.position.x = 0

        this.playerInfo.position.y--
        if (this.playerInfo.position.y < 0) this.playerInfo.position.y = 19
    }

    public moveSE() {
        this.playerInfo.position.x++
        if (this.playerInfo.position.x > 19) this.playerInfo.position.x = 0

        this.playerInfo.position.y++
        if (this.playerInfo.position.y > 19) this.playerInfo.position.y = 0
    }

    public modifyLevel(amount: number) {
        this.playerInfo.baseLevel += amount
    }
}