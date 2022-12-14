// A_VARIABLE=value npm run start:engine -> config.A_VARIABLE in code -> posible forma de entregar por terminar puertos
import dotenv from 'dotenv-defaults'
//import { ca, key, cert } from './keys/index.js'
dotenv.config()
export const config = process.env

function main() {
  let envs = ''
  Object.entries(process.env).forEach((value) => {
    envs += value[0] + '="' + value[1] + '"\n'
  })
  envs = envs.slice(0, envs.length - 1)
  return envs
}

main()

export const kafkaConfig = {
    brokers: [`${config.KAFKA_HOST}:${config.KAFKA_PORT}`],
    connectionTimeout: 20000, // time in milliseconds to wait for a successful connection
    requestTimeout: 20000, // '' for a request
    sessionTimeout: 20000,
    /*ssl:true,
    sslOptions: {
      rejectUnauthorized: false,
      ca: ca,
      cert: cert,
      key: key,
      passphrase: "ricardo"
    }*/
}
