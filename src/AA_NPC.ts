import { EngineStream, PlayerStream, PlayerEvents } from './types.js'
import { CommonPlayer } from './AA_Player.js'
import { KafkaUtil } from './kafka.js'
import { v4 as uuid } from 'uuid'

export class NPC extends CommonPlayer {
    public movementsArray: string[] = ['N', 'S', 'W', 'E', 'NW', 'NE', 'SW', 'SE']
    constructor(
        public KAFKA_HOST: string,
        public KAFKA_PORT: number,
    ){
        super()
    }

    public async joinGame(){
        this.playerInfo.alias += this.randomIntFromInterval(0, 99).toString() // added an random id to the alias 'NPC'

        const kafka = new KafkaUtil(this.playerInfo.alias, 'player', 'engineMessages') // it creates consumer and producer instances and is able to send messages to the corresponding topic
        console.log('Wating for the game to start...')

        try {
            // here enters to a loop and starts to consume all the messages from kafka
            await kafka.consumer.run({ 
                eachMessage: async (payload) => { // payload: raw message from kafka
                    if (payload.message.value){ // true if the value is different from undefined
                        const engineMessage: EngineStream = JSON.parse(payload.message.value.toString()) // converts the value in a JSON (kind of deserialization), Buffer -> string -> JSON
                        // only matters if engine write the alias of the player or if it is for all players
                        if (this.isEngineStreamReceiver(engineMessage)) this.processMessage(engineMessage, /*kafka*/) // process the message from kafka cluster that was sent by the engine
                        await this.sendNewMovement(kafka) // asks and send the event to the kafka cluster
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

    public async sendNewMovement(kafka: KafkaUtil) {
        await this.delay(1000) // each 1000ms stops execution
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