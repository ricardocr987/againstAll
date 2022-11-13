import { Paths } from './paths.js'
import { existsSync, mkdirSync, readFileSync } from 'fs'
import { format, Options } from 'prettier'
import { Server, Socket } from 'net'
import { EngineEvents, WeatherEvents, WeatherInfo } from './types.js'
import { config } from './config.js'

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
    public paths: Paths = new Paths(`./`) // is simply an object to make it easy to get the path to e.g. the database
    
    public io: Server // server instance

    // MAPS
    public cities: Record<number, string> = {} // key: number (id), value: city name
    public infoWeather: Record<string, WeatherInfo> = {} // key: city name, value: weather of that city

    constructor(        
        public SERVER_PORT: number,
    ) {
        this.io = new Server()
    }

    public getWeather() {
        if(!existsSync(this.paths.dataFile('cities')) || !existsSync(this.paths.dataFile('weather'))) {
            this.addCitiesNames()
            this.addWeather()
        }
    }

    public addCitiesNames () {
        // crea un vector de ciudades ['Alicante',... ] por lo menos 15
        // incluye esas ciudades en this.cities
        // escribe un fichero llamado 'cities' con esa informacion como JSON, basate getPlayers() de registry (no hace falta que compruebes la existencia del archivo)
        //         writeFileSync(this.paths.dataFile("registry"), format(JSON.stringify(this.registeredPlayers).trim(), options))

    }

    public addWeather () {
        // for de this.cities, randomizas temperatura con randomIntFromInterval (final de este archivo)
        // almacenas la info en this.infoWeather y escribes un fichero 'infoWeather' con la info del this.infoWeather
    }

    public Start(){
        this.io.on("connection", (socket: Socket) => {
            const remoteSocket = `${socket.remoteAddress}:${socket.remotePort}` // IP + Puerto del client
            console.log(`New connection from ${remoteSocket}`)
            socket.setEncoding("utf-8") // cada vez que recibe un mensaje automaticamente decodifica el mensaje, convirtiendolo de bytes a un string entendible
        
            socket.on("data", (message) => { // cuando envias un mensaje desde el cliente, (socket.write) -> recibes un Buffer (bytes) que hay que decodificar, para convertirlo en string .toString()
                switch(message.toString()){
                    case EngineEvents.GET_CITY_INFO:
                        // envia solo una ciudad random: crea una funcion que te de numero aleatorio, sacas el nombre de la ciudad con ese numero con el map y con el nombre de la ciudad sacas la temperatura con el otro map
                        // socket.write(`${WeatherEvents.WEATHER}:${cityName}:${cityWeather}`)
                        break
                }
            })
        })
        this.io.listen(this.SERVER_PORT) // el servidor escucha el puerto 
    }

    public randomIntFromInterval(min: number, max: number) { // min and max included 
        return Math.floor(Math.random() * (max - min + 1) + min)
    }
}

function main() {
    const WEATHER_SERVER_PORT = Number(config.ENGINE_SERVER_PORT) || 5670
    new Weather(WEATHER_SERVER_PORT).Start()
}

main()