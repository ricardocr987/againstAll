*TO-DO:*

- Parametrizar KAFKA host y MAX PLAYERS
- Varios engines
- Capturar fallos de caídas de servidores y que muestren mensajes en vez de que se lancen errores
- Hacer los cambios que se hicieron el día de la demo (printBoard, winner)

(P2):
- Conexion Registry-Player por API_REST: https://bravedeveloper.com/2021/03/22/crear-un-api-rest-con-nodejs-y-express-nunca-fue-tan-provechoso-y-sencillo/
- Consumo de API_rest de un servidor de clima
- API_Engine
- Frontend

-API KEY del Weather = 274d9ed11cbef3a98393a23a34f79bb7

*Software necesario:*

- Node.js (16.17.1)
- npm (8.15.0)
- Docker (20.10.17)

*Pasos para desplegar:*

1. docker-compose up
2. ./create-topics.sh 
3. Incluir IP del ordenador en el archivo config en el broker, es donde esta lanzado kafka
4. Modificar env.default con los puertos y hosts
5. npm run start
6. npm run start:registry
7. npm run start:weather
8. npm run start:engine
9. npm run start:player
