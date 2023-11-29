import { Room, Client } from "colyseus";
import { InputData, MyRoomState, Player } from "./schema/TestState";

export class MyRoom extends Room<MyRoomState> {
  fixedTimeStep = 1000 / 60;

  players: { [sessionId: string]: any } = {};

  onCreate(options: any) {
    this.setState(new MyRoomState());
    this.maxClients = 2;
    // set map dimensions
    this.state.mapWidth = 800;
    this.state.mapHeight = 600;

    this.onMessage(0, (client, input) => {
      // handle player input
      const player = this.state.players.get(client.sessionId);

      // enqueue input to user input buffer.
      player.inputQueue.push(input);
    });

    this.onMessage("hello", (client, input) => {
      // handle player input
      const player = this.state.players.get(client.sessionId);
      player.x = Number(input);

      // enqueue input to user input buffer.
      player.inputQueue.push(input);
    });
  }

  onJoin(client: Client, options: any) {
    console.log(client.sessionId, "joined! options =>", options);

    if(!options.global_id){
      client.leave();
      return;
    }

    const player = new Player();
    player.x = Math.random() * this.state.mapWidth;
    player.y = Math.random() * this.state.mapHeight;
    player.global_id = options.global_id;

    this.state.players.set(client.sessionId, player);
  }

  onLeave(client: Client, consented: boolean) {
    console.log(client.sessionId, "left!");
    this.state.players.delete(client.sessionId);
  }

  onCacheRoom() {
    return { hello: true };
  }

  onRestoreRoom(cached: any): void {
    console.log("ROOM HAS BEEN RESTORED!", cached);

    this.state.players.forEach(player => {
      player.method();
    });
  }

  onDispose() {
    console.log("room", this.roomId, "disposing...");
  }

}