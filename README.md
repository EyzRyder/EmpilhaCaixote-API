WS

Menssage
- `get-rooms`: Usuario pede pra retorna Salas publicas e recebe mensagem `rooms-updated`

- `create-room`: Usuario criar sala e recebe menssagem `room-created` e atualizar a lista de Salas e avisa todos no broadcast com mensagem `rooms-updated`

- `join-room`: Tenta colcar usuario na sala, se conseguir apenas os que estão na sala com menssagem de broadcast `player-joined`

- `ready`: Usuário avisa que está pronto pra jogar e retorna broadcast com mensagem `ready-update` e se os dois estão prontos retorna `start-game`

- `play`: