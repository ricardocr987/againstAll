import { PlayerStream, PlayerEvents } from './types.js'
import { randomIntFromInterval, movementsArray, delay } from './utils.js'
import { CommonPlayer } from './CommonPlayer.js'
import { config } from './config.js'
import { KafkaUtil } from './kafka.js'
import { v4 as uuid } from 'uuid'

export class NPC extends CommonPlayer {
    constructor(KAFKA_HOST: string, KAFKA_PORT: number,){
        super(KAFKA_HOST, KAFKA_PORT)
    }

    public async newMomevent(kafka: KafkaUtil) {
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
    const KAFKA_HOST = config.KAFKA_HOST || 'localhost'
    const KAFKA_PORT = Number(config.KAFKA_PORT) || 9092 // docker-compose (KAFKA_LISTENERS)

    const npc = new NPC(KAFKA_HOST, KAFKA_PORT)
    npc.playerInfo.alias += randomIntFromInterval(0, 99) // added an random id to the alias 'NPC'
    await npc.joinGame()
}

await main()