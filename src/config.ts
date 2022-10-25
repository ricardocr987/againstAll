export const kafkaConfig = {
    brokers: ['broker:9092'],
    connectionTimeout: 3000,
    authenticationTimeout: 1000,
    reauthenticationThreshold: 10000,
}

export const config = process.env // A_VARIABLE=value npm run start:engine -> config.A_VARIABLE in code -> posible forma de entregar por terminar puertos
