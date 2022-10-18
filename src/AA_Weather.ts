import { Paths } from './paths.js'
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs'
import { format, Options } from 'prettier'
import { Server, Socket } from 'net'
import { PlayerEvents, RegistryEvents, WeatherI } from './types.js'
import * as fs from 'fs'

export class Weather{
    public paths: Paths =new Paths(`./`)
    public port: number
    public io:  Server
    public peticion: String
    public weathers: Record<string, WeatherI> = this.getWeather()

    constructor(port: number) {
        this.port = port
        this.io = new Server()
    }

    public getWeather(): Record<string, WeatherI> {
        const actualWeather: Record<string, WeatherI> = {}
        const weathers: Record<string, WeatherI> = JSON.parse(readFileSync(this.paths.dataFile("registry"), "utf8")) // leo fichero

        for(const weather of Object.values(weathers)){
            actualWeather[weather.temperature] = weather
        }
        return actualWeather
    }

    public getTemperature(weather: WeatherI){
        const fileName: string = 'Weather.txt'
        let fileContent = fs.readFileSync(fileName, 'utf8')
        console.log(fileContent)

        this.weathers[weather.temperature] = weather
        if(!existsSync(this.paths.dataDir))
            mkdirSync(this.paths.dataDir)

        

    }

    public Start(){
        this.io.on("connection", (socket: Socket) => {
            const remoteSocket = `${socket.remoteAddress}:${socket.remotePort}` // IP + Puerto del client
            console.log(`New connection from ${remoteSocket}`)
            socket.setEncoding("utf-8") // cada vez que recibe un mensaje automaticamente decodifica el mensaje, convirtiendolo de bytes a un string entendible
        
            socket.on("data", (message) => { // cuando envias un mensaje desde el cliente, (socket.write) -> recibes un Buffer (bytes) que hay que decodificar, para convertirlo en string .toString()
                const [temperature, city] = message.toString().split(':') // creamos un vector de la respuesta del cliente con las tres variables
                
                const weatherInfo: WeatherI = { 
                    temperature,
                    city
                }

                
                let check = false

                try{
                    check = this.getTemperature(weatherInfo)
                }catch(e){
                    //mandar error
                }


            })
        })
        this.io.listen(this.port) // el servidor escucha el puerto 
    }

}
function main() {
    const PORT = 1364
    new Weather(Number(PORT)).Start()
}
main()