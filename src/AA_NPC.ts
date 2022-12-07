import { EngineStream, PlayerStream, PlayerEvents, EngineEvents } from './types.js'
import { randomIntFromInterval, movementsArray, printBoard, delay } from './utils.js'
import { KafkaUtil } from './kafka.js'
import { v4 as uuid } from 'uuid'
import { CommonPlayer } from './CommonPlayer'

export class NPC extends CommonPlayer {
    constructor(KAFKA_HOST: string, KAFKA_PORT: number,){
        super(KAFKA_HOST, KAFKA_PORT)
    }

    public async joinGame(){
        const kafka = new KafkaUtil(this.playerInfo.alias, 'player', 'engineMessages') // it creates consumer and producer instances and is able to send messages to the corresponding topic
        await kafka.producer.connect()
        await kafka.consumer.connect()
        await kafka.consumer.subscribe({ topic: 'engineMessages', /*fromBeginning: true*/ })
        
        this.playerInfo.alias += randomIntFromInterval(0, 99).toString() // added an random id to the alias 'NPC'

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
                                            printBoard(engineMessage.map)
                                        }
                                    }
                                }
                                await this.sendNewMovement(kafka) // asks and send the event to the kafka cluster
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

    public async sendNewMovement(kafka: KafkaUtil) {
        await delay(5000) // each 1000ms stops execution
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
        const randomPos = randomIntFromInterval(0,8)
        return movementsArray[randomPos]
    }
}

async function main() {
    const BROKER_HOST = 'localhost' // aqui se escribira la ip del ordenador donde este lanzado el server (engine & registry), pero si lo haces todo desde el mismo pc en diferentes terminales es localhost
    const BROKER_PORT = 5670

    const npc = new NPC(BROKER_HOST, BROKER_PORT)
    await npc.joinGame()
}

await main()