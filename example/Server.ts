import http from "http";
import express from "express";
import { Server } from "@colyseus/core";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { monitor } from "../src/index"
import { playground } from '@colyseus/playground'
import { WalkingRoom } from "./WalkingRoom";
import { BattlerRoom } from "./BattlerRoom";

const port = Number(process.env.PORT || 2568);
const endpoint = "localhost";

const app = express();
const server = http.createServer(app);
const transport = new WebSocketTransport({server});

const gameServer = new Server({
  transport,
});

app.use(express.json());
app.get("/hello", (req, res) => {
  res.json({hello: "world!"});
});

gameServer.define("walking_room", WalkingRoom);
gameServer.define("party_room", WalkingRoom);
gameServer.define("battler_room", BattlerRoom);

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

gameServer.listen(port)
  .then(() => console.log(`Listening on ws://${endpoint}:${port}`))
  .catch((err) => {
    console.log(err);
    process.exit(1)
  });

