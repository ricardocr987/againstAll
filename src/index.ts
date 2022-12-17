//export class index
var express = require('express')
var app = express()
var morgan = require('morgan')


app.set('port', process.env.PORT || 3000)
app.set('json spaces', 2)

app.use(morgan('dev'))
app.use(express.urlenconded({extended:false}))
app.use(express.json())


app.get('/', (/*req: any, */res: any) => {
    res.json(
        {
            'Title': 'Hola Mundo'
        }
    )
})

app.listen(app.get('port'), () => {
    console.log(`Server listening on port ${app.get('port')}`)
})
