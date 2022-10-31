import { Paths } from './paths.js'
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs'
import { format, Options } from 'prettier'
import { Server, Socket } from 'net'
import { WeatherInfo, WeatherI } from './types.js'


const options: Options = {
    semi: false,
    singleQuote: true,
    trailingComma: 'es5',
    useTabs: false,
    tabWidth: 2,
    arrowParens: 'always',
    printWidth: 80,
    parser: 'json',
} // necesario para darle el formato correcto al mapa a la hora de escribir el fichero json


export class Weather{
    public paths: Paths =new Paths(`./`)
    public port: number
    public io:  Server
    public peticion: String = ''
    public num: number
    public city: string
    public temperature: number
    public weathers: Record<number, WeatherI> = this.getWeather()
    public infoWeather: Record<string, WeatherInfo> = {}

    constructor(port: number) {
        this.port = port
        this.io = new Server()
        this.num = 0
        this.city = ''
        this.temperature = Math.random()*20
    }

    public getWeather(): Record<string, WeatherI> {

        if(!existsSync(this.paths.dataDir)) return {}// si no existe la carpeta data ...

        const weathers: Record<number, WeatherI> = {}
        const weather1: Record<number, WeatherI>  = JSON.parse(readFileSync(this.paths.dataFile("eather"), 'utf8'))
        for(const weather of Object.values(weather1)){
            weathers[weather.num] = weather
        }

        return weathers
    }

    public get weather(): WeatherInfo{
        return {
            num: this.num,
            city: this.city,
            temperature: this.temperature
        }
    }

    public Start(){
        this.io.on("connection", (socket: Socket) => {
            const remoteSocket = `${socket.remoteAddress}:${socket.remotePort}` // IP + Puerto del client
            console.log(`New connection from ${remoteSocket}`)
            socket.setEncoding("utf-8") // cada vez que recibe un mensaje automaticamente decodifica el mensaje, convirtiendolo de bytes a un string entendible
        
            socket.on("data", (message) => { // cuando envias un mensaje desde el cliente, (socket.write) -> recibes un Buffer (bytes) que hay que decodificar, para convertirlo en string .toString()
                const [num, city] = message.toString().split(':') // creamos un vector de la respuesta del cliente con las tres variables
                
                const weatherInfo: WeatherI = { 
                    num,
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