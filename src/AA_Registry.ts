import { Player } from './AA_Player'
import { Paths } from './paths'
import { existsSync, mkdirSync, writeFileSync, readFileSync } from "fs" 
import { format, Options } from 'prettier'

export class Registry {
    public registeredPlayers: Record<string, Player> = this.getPlayers() // cuando se crea un objeto lee el json para cargar los datos de antiguas ejecuciones
    public paths: Paths = new Paths(`./`) // es simplemente un objecto para que sea facil obtener la ruta de por ejemplo la base de datos
    public options: Options = {
        semi: false,
        singleQuote: true,
        trailingComma: 'es5',
        useTabs: false,
        tabWidth: 2,
        arrowParens: 'always',
        printWidth: 80,
        parser: 'json',
    } // necesario para darle el formato correcto al record, registeredPlayers es un map clave-valor, no puede haber dos jugadores con la misma clave, es decir el alias,
    // como valor establece toda la instancia del jugador, es decir que tengo toda su informacion

    public getPlayers(): Record<string, Player> {
        const registeredPlayers: Record<string, Player> = {}

        const players = JSON.parse(readFileSync(this.paths.dataFile('registry'), 'utf8')) // leo fichero
        for(const player of players){ // recorro todos los jugadores que habian sido almacenados en el fichero y los vuelvo a guardar en el map
            registeredPlayers[player.alias] = player
        }

        return registeredPlayers
    }

    public registerPlayer(player: Player) { // creo perfil de player
        if(this.registeredPlayers[player.alias]) throw new Error('There is already a player with the same alias')

        this.registeredPlayers[player.alias] = player
        if(!existsSync(this.paths.dataDir))
            mkdirSync(this.paths.dataDir)

        writeFileSync(this.paths.dataFile('registry'), format(JSON.stringify(this.registeredPlayers).trim(), this.options)) // sobreescribo todo el fichero pero incluyendo al nuevo
    }

    public editPlayer(player: Player) {
        if(!this.registeredPlayers[player.alias]) throw new Error('This alias does not exist on the database')
        if(this.registeredPlayers[player.alias].password != player.password) throw new Error('The password is not correct') // no tengo claro que esto sea necesario

        this.registeredPlayers[player.alias] = player // simplemente sobreescribo los datos del player
        if(!existsSync(this.paths.dataDir))
            mkdirSync(this.paths.dataDir)

        writeFileSync(this.paths.dataFile('registry'), format(JSON.stringify(this.registeredPlayers).trim(), this.options)) 
    }
}