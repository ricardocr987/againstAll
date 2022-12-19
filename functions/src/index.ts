import * as functions from 'firebase-functions'
import * as express from 'express'
import * as bodyParser from 'body-parser'
import * as cors from 'cors'
import { createPlayer, getAllPlayers, getPlayerByAlias, updatePlayer, deletePlayer } from './controllers/player'
import { createGame, getAllActiveGames, updateGame, deleteGame } from './controllers/game'

const app = express()
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))
app.use(cors({ origin: true }))

app.post('/players', createPlayer)
app.get('/players', getAllPlayers)
app.get('/players/:playerId', getPlayerByAlias)
app.put('/players/:playerId', updatePlayer)
app.delete('/players/:playerId', deletePlayer)

app.post('/games', createGame)
app.get('/games', getAllActiveGames)
app.put('/games/:gameId', updateGame)
app.delete('/games/:gameId', deleteGame)

exports.app = functions.https.onRequest(app)