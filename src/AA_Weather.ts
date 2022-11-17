import { Paths } from './paths.js'
import { existsSync, writeFileSync, readFileSync, mkdirSync } from 'fs'
import { format, Options } from 'prettier'
import { Server, Socket } from 'net'
import { WeatherEvents } from './types.js'
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
} // necessary to format the map correctly when writing the json file

export class Weather{
    public paths: Paths = new Paths(`./`) // is simply an object to make it easy to get the path to e.g. the database
    
    public io: Server // server instance

    // MAPS
    public cities: Record<number, string> = {} // key: number (id), value: city name
    public infoWeather: Record<string, string> = {} // key: city name, value: weather of that city

    public citiesSent: number[] = [] // id of ther city sent, to no repeat cities

    constructor(        
        public SERVER_PORT: number,
    ) {
        this.io = new Server()

        this.getWeather() // get data from a db file or generates the data
    }

    public getWeather() {
        if(!existsSync(this.paths.dataFile('cities')) || !existsSync(this.paths.dataFile('weather'))|| !existsSync(this.paths.dataDir) ) {
            this.addCitiesNames()
            this.addWeatherInfo()
        }
        else {
            this.cities = JSON.parse(readFileSync(this.paths.dataFile("cities"), "utf8"))
            this.infoWeather = JSON.parse(readFileSync(this.paths.dataFile("weathers"), "utf8"))
        }
    }

    public addCitiesNames () {
        const cities = ['Alicante', 'Paris', 'London', 'Berlin', 'Munich', 'Valencia', 'Manchester', 'Milan', 'Liverpool', 'Napoles', 'Hong Kong', 'Medellin', 'Murcia', 'Granada', 'Venecia', 'Prague', 'Krakow', 'Moscow']

        for (let i = 0; i < cities.length; i++) {
            this.cities[i] = cities[i]
        }
        mkdirSync(this.paths.dataDir)
        writeFileSync(this.paths.dataFile("cities"), format(JSON.stringify(this.cities).trim(), options))   
    }

    public addWeatherInfo () {
        for (let i = 0; i < Object.keys(this.cities).length; i++) {
            this.infoWeather[this.cities[i]] = this.randomIntFromInterval(-35, 35).toString()
        }

        writeFileSync(this.paths.dataFile("weathers"), format(JSON.stringify(this.infoWeather).trim(), options))   
    }

    public getRandomWeather() {
        let randomNum = -1
        let check = false

        while (!check) {
            randomNum = this.randomIntFromInterval(0, Object.keys(this.cities).length - 1)
            if (!this.citiesSent.includes(randomNum)) check = true
        }

        this.citiesSent.push(randomNum)

        return [this.cities[randomNum], this.infoWeather[this.cities[randomNum]]]
    }

    public Start(){
        this.io.on("connection", (socket: Socket) => {
            const remoteSocket = `${socket.remoteAddress}:${socket.remotePort}` // IP + Client port
            console.log(`New connection from ${remoteSocket}`)
            socket.setEncoding("utf-8") // each time it receives a message it automatically decodes the message, converting it from bytes to an understandable string.
        
            socket.on("data", () => { // when you send a message from the client, (socket.write) -> you receive a Buffer (bytes) that needs to be decoded, to convert it into a string .toString()
                const [cityName, cityWeather] = this.getRandomWeather()
                console.log('sending: ', cityName, cityWeather)
                socket.write(`${WeatherEvents.WEATHER}:${cityName}:${cityWeather}`)
                if (this.citiesSent.length === 4) this.citiesSent = []
            })
        })
        this.io.listen(this.SERVER_PORT)
    }

    public randomIntFromInterval(min: number, max: number) { // min and max included 
        return Math.floor(Math.random() * (max - min + 1) + min)
    }
}

function main() {
    const WEATHER_SERVER_PORT = Number(config.WEATHER_SERVER_PORT) || 5366
    new Weather(WEATHER_SERVER_PORT).Start()
}

main()