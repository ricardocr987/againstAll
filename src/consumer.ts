import Kafka from 'node-rdkafka' 
import { schema } from './types' 

export class Consumer {
    public consumer = this.getConsumer()

    constructor(
        public HOST: string,
        public PORT: number,
    ) {
        this.consumer.connect() 

        this.consumer.on('ready', () => {
            console.log('consumer ready..')
            this.consumer.subscribe(['test']) 
            this.consumer.consume() 
        }).on('data', function(data) {
            if (data.value) console.log(`received message: ${schema.fromBuffer(data.value)}`) 
        }) 
    }

    public getConsumer() {
        return new Kafka.KafkaConsumer({
            'group.id': 'kafka',
            'metadata.broker.list': `${this.HOST}:${this.PORT}`, //localhost:9092',
        }, {}) 
    }
}