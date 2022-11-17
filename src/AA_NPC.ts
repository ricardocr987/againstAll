import { EngineStream, PlayerStream, PlayerEvents, EngineEvents, PlayerInfo } from './types.js'
import { KafkaUtil } from './kafka.js'
import { v4 as uuid } from 'uuid'

export class NPC {
    public movementsArray: string[] = ['N', 'S', 'W', 'E', 'NW', 'NE', 'SW', 'SE']

        // PlayerInfo
        public playerInfo: PlayerInfo

        public timestamp: number = Date.now()
        public messagesRead: string[] = []
    
        // Flags to identify the phase of the game
        public startedGame = false
        public finishedGame = false

    constructor(
        public KAFKA_HOST: string,
        public KAFKA_PORT: number,
    ){
        this.playerInfo = {
            alias: 'NPC', // initilized like this, if it is a Player will be overwritten
            position: {
                x: this.randomIntFromInterval(0, 19), // 0-19
                y: this.randomIntFromInterval(0, 19) // 0-19
            },
            baseLevel: 1,
            coldEffect: this.randomIntFromInterval(-10, 10),
            hotEffect: this.randomIntFromInterval(-10, 10),
        }
    }

    public randomIntFromInterval(min: number, max: number) { // min and max included 
        return Math.floor(Math.random() * (max - min + 1) + min)
    }

    // true if the message includes the alias explicitly or if it a message for all
    public isEngineStreamReceiver (engineMessage: EngineStream): boolean { 
        return engineMessage.playerAlias === this.playerInfo.alias || engineMessage.messageToAll === true
    }

    public printBoard(map: string[][]) {
        console.table(map)
    }

    public async processMessage(message: EngineStream){
        switch (message.event){

            case EngineEvents.GAME_NOT_PLAYABLE: // when someone try to send a NEW_POSITION event and the game hasnt started or already finished
                console.log(message.playerAlias, ': ', message.error)
                // if (this.finishedGame) kafka.pauseConsumer()

                break
            
            case EngineEvents.GAME_ENDED:
                //kafka.pauseConsumer()
                this.finishedGame = true

                console.log('The game has ended')

                break
            
            case EngineEvents.DEATH:
                //kafka.pauseConsumer()
                this.finishedGame = true

                console.log('You lost, someone or a mine killed you')
                process.exit(0)

                break

            case EngineEvents.MOVEMENT_OK:
                if (message.event2) {
                    switch (message.event2) { // se podria eliminar este switch y direcrtamente mostrar el mapa
                        case EngineEvents.KILL:
                            // podria mostrar algun mensaje o informacion sobre el playerInfo
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
        if (message.map) this.printBoard(message.map)
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

    public async joinGame(){
        this.playerInfo.alias += this.randomIntFromInterval(0, 99).toString() // added an random id to the alias 'NPC'

        const kafka = new KafkaUtil(this.playerInfo.alias, 'player', 'engineMessages') // it creates consumer and producer instances and is able to send messages to the corresponding topic

        await kafka.producer.connect()
        await kafka.consumer.connect()

        await kafka.consumer.subscribe({ topic: 'engineMessages', /*fromBeginning: true*/ })
        
        console.log('Wating for the game to start...')

        try {
            // here enters to a loop and starts to consume all the messages from kafka
            await kafka.consumer.run({ 
                eachMessage: async (payload) => { // payload: raw message from kafka
                    if (Number(payload.message.timestamp) > this.timestamp) {
                        if (payload.message.value){ // true if the value is different from undefined
                            const engineMessage: EngineStream = JSON.parse(payload.message.value.toString()) // converts the value in a JSON (kind of deserialization), Buffer -> string -> JSON
                            //console.log(engineMessage)
                            if (!this.messagesRead.includes(engineMessage.id)) { // i want to make sure all the messages are read only one time
                                if (this.startedGame) {
                                    // only matters if engine write the alias of the player or if it is for all players
                                    if (this.isEngineStreamReceiver(engineMessage)){
                                        await this.processMessage(engineMessage) // process the message from kafka cluster that was sent by the engine
                                        this.messagesRead.push(engineMessage.id)
                                    }
                                }
                                else {
                                    if (engineMessage.event === EngineEvents.GAME_STARTED) {
                                        // we will process the kafka messages after receiving this event from the engine
                                        this.startedGame = true
                                        console.log('THE GAME HAS JUST STARTED')
                                        if (engineMessage.map) {
                                            await kafka.sendRecord({
                                                id: uuid(),
                                                event: PlayerEvents.INITIAL_MESSAGE,
                                                playerInfo: this.playerInfo
                                            })
                                            this.printBoard(engineMessage.map)
                                        }
                                    }
                                }
                                await this.sendNewMovement(kafka) // asks and send the event to the kafka cluster
                            }
                        }
                        else {
                            console.log("Error: Received a undefined message")
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

    public async sendNewMovement(kafka: KafkaUtil) {
        await this.delay(5000) // each 1000ms stops execution
        const movement = this.getNewMovement()
        this.changePosition(movement)

        const event: PlayerStream = {
            id: uuid(),
            event: PlayerEvents.NEW_POSITION,
            playerInfo: this.playerInfo
        }

        kafka.sendRecord(event)
    }

    public getNewMovement(): string {
        const randomPos = this.randomIntFromInterval(0,8)
        return this.movementsArray[randomPos]
    }

    public delay(ms: number) {
        return new Promise( resolve => setTimeout(resolve, ms) );
    }
}

async function main() {
    const BROKER_HOST = "localhost" // aqui se escribira la ip del ordenador donde este lanzado el server (engine & registry), pero si lo haces todo desde el mismo pc en diferentes terminales es localhost
    const BROKER_PORT = 5670

    const npc = new NPC(BROKER_HOST, BROKER_PORT)
    await npc.joinGame()
}

await main()