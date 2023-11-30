import { Room, Client } from "colyseus";
import { AddStringAttribute, BattlerSchema, GameObjectSchema } from "./schema/TestState";

export class BattlerRoom extends Room<BattlerSchema> {
  onCreate(options: any) {
    this.setState(new BattlerSchema());
    this.maxClients = 1;
  }

  onJoin(client: Client, options: any) {
    console.log(client.sessionId, "joined! options =>", options);
    if(!options.global_id){
      client.leave();
      return;
    }

    const new_entity = new GameObjectSchema();
    AddStringAttribute(new_entity.attributes, ["global_client_id", options.global_id])

    this.state.entities.push(new_entity);
  }

  onLeave(client: Client, consented: boolean) {
    console.log(client.sessionId, "left!");
    this.state.entities.clear();
  }

  onCacheRoom() {
    return { hello: true };
  }

  onDispose() {
    console.log("room", this.roomId, "disposing...");
    this.state.entities.clear();
  }

}