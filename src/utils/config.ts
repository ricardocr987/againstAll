// A_VARIABLE=value npm run start:engine -> config.A_VARIABLE in code -> posible forma de entregar por terminar puertos
import dotenv from 'dotenv-defaults'
import admin from 'firebase-admin'

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
    brokers: [`${config.KAFKA_HOST}:9092`],
    connectionTimeout: 20000, // time in milliseconds to wait for a successful connection
    requestTimeout: 20000, // '' for a request
    sessionTimeout: 20000,
}

const serviceAccount = 'firebase-adminsdk-jm0rq@againstall-f897a.iam.gserviceaccount.com'
export const FirebaseConfig = {
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://againstall-f897a-default-rtdb.europe-west1.firebasedatabase.app"
}