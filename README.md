*TO-DO:*

- Player invitado
- Cifrado de los datos entre Engine y los Jugadores
- Autenticación segura entre los Jugadores y el Registry: cifrado del canal y protección segura de las contraseñas. API_REST con Firebase: https://firebase.google.com/docs/reference/rest/database 

*Notas:*

- En el front solo se ve el estado de la partida, los jugadores se mueven como antes
- Configurar certificado del servidor https (front-end)

*Software necesario:*

- Node.js (16.17.1)
- npm (8.15.0)
- Docker (20.10.17)

*Steps to deploy:*

0. Open docker app
1. docker-compose up -> to deploy kafka
2. ./create-topics.sh  -> para crear los topics de la queue de kafka
3. modificar los puertos y las IPs desde el archivo env.default -> crea variables de entorno
(ipconfig red: adaptador ethernet ipv4) 
5. npm run start -> instala dependencia y transpila el codigo
6. npm run start:registry -> ejecuta el codigo transpilado de registry
7. npm run start:engine
8. npm run start:player
9. cd react-againstall -> front end
10. npm i && npm run start -> install dependencies and run localhost:3000

