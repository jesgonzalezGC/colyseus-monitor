import { Room, Client } from "colyseus";
import { WalkingState, Player } from "./schema/TestState";

export class WalkingRoom extends Room<WalkingState> {
  fixedTimeStep = 1000 / 60;

  players: { [sessionId: string]: any } = {};

  onCreate(options: any) {
    this.setState(new WalkingState());
    this.maxClients = 20;

    this.onMessage(0, (client, input) => {
      // handle player input
      const player = this.state.players.get(client.sessionId);
      if (!player) {
        return;
      }
    });

    this.onMessage("hello", (client, input) => {
      // handle player input
      const player = this.state.players.get(client.sessionId);
      if (!player) {
        return;
      }
    });
  }

  onJoin(client: Client, options: any) {
    console.log(client.sessionId, "joined! options =>", options);

    if(!options.global_id){
      client.leave();
      return;
    }

    const player = new Player();
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

  onDispose() {
    console.log("room", this.roomId, "disposing...");
  }

}