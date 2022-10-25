import { Kafka, Producer, Message, Consumer } from "kafkajs" 
import { EngineStream, PlayerStream, UnionStream } from './types.js'
import { kafkaConfig } from './config.js'

export class KafkaUtil {
    public producerClient: Kafka
    public producer: Producer // Producers are those client applications that publish (write) events to Kafka
    public consumerClient: Kafka
    public consumer: Consumer
    public topic: string

    constructor(
        clientId: string,
        clientType: string,
        topic: string // es al que se va a suscribir el consumidor, ie: player se suscribira al topic engineMessages y engine al de playerMessages
    ){
        this.producerClient = new Kafka({
            ...kafkaConfig, // meto las propiedades de la variable en el record
            clientId: `${clientType}:${clientId}:producer`,
        })
        this.producer = this.producerClient.producer()

        this.consumerClient = new Kafka({
            ...kafkaConfig,
            clientId: `${clientType}:${clientId}:consumer`,
        })
        this.consumer = this.consumerClient.consumer({ groupId: `${clientType}` })

        this.topic = topic
    }

    public async startProducer(){
        await this.producer.connect()
    }

    public async startConsumer(){
        await this.consumer.connect()

        await this.consumer.subscribe({ topic: `${this.topic}`, fromBeginning: true })

        await this.consumer.run({
            eachMessage: async ({ topic, partition, message }) => {
                if(message.value){
                    console.log({
                        topic,
                        partition,
                        offset: message.offset,
                        value: message.value.toString(),
                    })
                }
                else {
                    console.log("Message value null") // throw error?
                }
            },
        })
    }

    /*
        An event records the fact that something happened (also called record or message)
        Here's an example event:
            Event key: "Alice"
            Event value: "Made a payment of $200 to Bob"
            Event timestamp: "Jun. 25, 2020 at 2:06 p.m."
    */
    public async sendRecord(event: UnionStream) {
        const buffer = Buffer.from(JSON.stringify(event))
        const messages: Message[] = []
        messages.push({ value: buffer }) // esto puede ser utili para especificar headers, timestamp, partition, etc.

        if(this.isPlayerStream(event)) 
            await this.producer.send({
                topic: 'playerMessages',
                messages: messages,
            })

        if(this.isEngineStream(event))
            await this.producer.send({
                topic: 'engineMessages',
                messages: messages,
            })
    }

    public isPlayerStream(stream: UnionStream): stream is PlayerStream {
        return (stream as PlayerStream).alias !== undefined
    }

    public isEngineStream(stream: UnionStream): stream is EngineStream {
        return (stream as EngineStream).engine !== undefined
    }
}