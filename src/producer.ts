import Kafka from 'node-rdkafka' 
import { schema } from './types' 

export class Producer {
  public stream = this.getStream()

  constructor(
      public HOST: string,
      public PORT: number,
  ) {
    this.stream.on('error', (err) => {
      console.error('Error in our kafka stream') 
      console.error(err) 
    }) 

    setInterval(() => { // timeout, esto no tiene sentido en el contructor
      this.queueRandomMessage() 
    }, 3000) 
  }

  public getStream() {
      return Kafka.Producer.createWriteStream({
        'metadata.broker.list': 'localhost:9092' // check docker-compose (port)
      }, {}, {
        topic: 'test' // 3rd parameter is topics
      }) 
  }

  public queueRandomMessage() {
    const category = this.getRandomAnimal() 
    const event = { category } 
    const success = this.stream.write(schema.toBuffer(event)) // writes to the kafka cluster  
    if (success) {
      console.log(`message queued (${JSON.stringify(event)})`) 
    } else {
      console.log('Too many messages in the queue already..') 
    }
  }
  
  public getRandomAnimal() {
    const categories = ['CAT', 'DOG'] 
    return categories[Math.floor(Math.random() * categories.length)] 
  }
}