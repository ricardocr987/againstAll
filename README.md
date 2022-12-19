*TO-DO:*
- Arreglar registry con Sockets
- Manejar servidores caidos (comprobar en todos los servicios que pasa cuando otra componente este caido y capturar los errores para mostrar los mensajes)
- Auditoría de eventos en el Registry (ip, operac, timestamp)
- Cifrado de los datos entre Engine y los Jugadores
- Autenticación segura entre los Jugadores y el Registry: cifrado del canal y protección segura de las contraseñas. API_REST con Firebase: https://firebase.google.com/docs/reference/rest/database 
- API_Engine con Firebase
- Frontend

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

*Para actualizar mi rama $ git merge main*
*Firebase de google como bd*
*para abrir puerto desde ./REST_SD npm start / node dist/appSD.js en http://localhost:3000/*

*Escribir en un .txt desde engine los sucesos de la partida e ir enviando este .txt a appSD.js según sucedan los cambios*