import { Kafka, Producer, Message, Consumer } from "kafkajs" 
import { EngineStream, PlayerStream, UnionStream } from './types.js'
import { kafkaConfig } from './config.js'

// as both engine and player perform a bidirectional communication, i.e. they are both producers and consumers at the same time
// I thought that there would be less code if I standardized everything in kafka in a single class that did practically everything (unless processing messages)
export class KafkaUtil {
    public producerClient: Kafka
    public producer: Producer // producers are those client applications that publish (write) events to Kafka
    
    public consumerClient: Kafka
    public consumer: Consumer // consumer are those client applications that consume (read) events to Kafka
    
    public topic: string // is the one the consumer will subscribe to, ie: player will subscribe to the engineMessages topic and engine to the playerMessages topic, to read those messages

    constructor(
        clientId: string,
        clientType: string,
        topic: string,
    ){
        this.producerClient = new Kafka({
            ...kafkaConfig, // standard config in config.ts
            clientId: `${clientType}:${clientId}:producer`,
        })
        this.producer = this.producerClient.producer()

        this.consumerClient = new Kafka({
            ...kafkaConfig,
            clientId: `${clientType}:${clientId}:consumer`,
        })
        
        this.consumer = this.consumerClient.consumer({ groupId: `${clientType}:${clientId}` })

        this.topic = topic
    }

    /*
        An event records the fact that something happened (also called record or message)
        Here's an example event:
            Event key: "Alice"
            Event value: "Made a payment of $200 to Bob"
            Event timestamp: "Jun. 25, 2020 at 2:06 p.m."
    */
    public async sendRecord(event: UnionStream) {
        const buffer = Buffer.from(JSON.stringify(event)) // JSON -> String -> Buffer, it is like a kind of serialization
        const messages: Message[] = []
        messages.push({ 
            value: buffer,
        /* Here you could define this info also in the message:
            headers: ,
            timestamp: ,
            partition: ,
        */
        })

        // depending in the kind of the stream that is received, is sent to its corresponding topic in the kafka cluster:
        if(this.isPlayerStream(event)) {
            await this.producer.send({
                topic: 'playerMessages',
                messages: messages,
            })}

        if(this.isEngineStream(event)) {
            await this.producer.send({
                topic: 'engineMessages',
                messages: messages,
            })}
    }

    // pauses consumer topic consumption
    public pauseConsumer() {
        const topics = [{topic: this.topic}]
        this.consumer.pause(topics)
    }

    // resume consumer topic consumption
    public resumeConsumer() {
        setTimeout(() => this.consumer.resume([{ topic: this.topic }]), 10000)
    }

    // Guards to identify the kind of stream is received in sendRecord function
    public isPlayerStream(stream: UnionStream): stream is PlayerStream {
        return (stream as PlayerStream).playerInfo !== undefined
    }

    public isEngineStream(stream: UnionStream): stream is EngineStream {
        return (stream as EngineStream).playerAlias !== undefined || (stream as EngineStream).messageToAll !== undefined
    }
}