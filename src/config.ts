export const kafkaConfig = {
    brokers: ['localhost:9092'],
    connectionTimeout: 3000, // time in milliseconds to wait for a successful connection
    requestTimeout: 2500, // '' for a request
}

export const config = process.env // A_VARIABLE=value npm run start:engine -> config.A_VARIABLE in code -> posible forma de entregar por terminar puertos
