import http from "http";
import express from "express";
import { Server, RelayRoom, LobbyRoom } from "@colyseus/core";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { monitor } from "../src/index"
import { playground } from '@colyseus/playground'

// import { MongooseDriver  } from "@colyseus/mongoose-driver";
// import { uWebSocketsTransport } from "@colyseus/uwebsockets-transport";

// import expressify from "uwebsockets-express";

import { DummyRoom } from "./DummyRoom";
import { MyRoom } from "./MyRoom";

const port = Number(process.env.PORT || 2568);
const endpoint = "localhost";

// Create HTTP & WebSocket servers
const app = express();
const server = http.createServer(app);
const transport = new WebSocketTransport({server});

// const transport = new uWebSocketsTransport();
// const app = expressify(transport.app);

const gameServer = new Server({
  transport,

  // server: server,
  // presence: new RedisPresence(),
  // driver: new RedisDriver(),

  // devMode: true,

  // // driver: new MongooseDriver(),
  // publicAddress: `localhost:${port}`,
});

app.use(express.json());
app.get("/hello", (req, res) => {
  res.json({hello: "world!"});
});

gameServer.define("my_room", MyRoom);

app.use(express.static(__dirname));
console.log("*********** create monitor");

app.get('/test', (req, res) => {
    res.json({test: "cosa"});
  });

app.use('/colyseus', monitor());
app.use("/playground", playground);

gameServer.onShutdown(() => {
  console.log("CUSTOM SHUTDOWN ROUTINE: STARTED");

  return new Promise<void>((resolve, reject) => {
    setTimeout(() => {
      console.log("CUSTOM SHUTDOWN ROUTINE: FINISHED");
      resolve();
    }, 1000);
  })
});

// process.on('unhandledRejection', r => console.log('unhandledRejection...', r));

gameServer.listen(port)
  .then(() => console.log(`Listening on ws://${endpoint}:${port}`))
  .catch((err) => {
    console.log(err);
    process.exit(1)
  });

