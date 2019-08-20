//
// Monkey-patch Colyseus' default behaviour
//
import { Room, Client } from "colyseus";

(<any>Room.prototype).getAvailableData = function () {
    return {
        clients: this.clients.length,
        maxClients: this.maxClients,
        metadata: this.metadata,
        roomId: this.roomId,
    };
};

(<any>Room.prototype).getRoomListData = async function () {
    const fullState = this._serializer.getFullState({});
    const stateSize = fullState.byteLength || fullState.length || 0;
    const elapsedTime = this.clock.elapsedTime;
    const locked = this.locked;
    const data = this.getAvailableData();

    return { ...data, locked, elapsedTime, stateSize };
};

(<any>Room.prototype).getInspectData = async function () {
    const state = this.state;

    const fullState = this._serializer.getFullState({});
    const stateSize = fullState.byteLength || fullState.length || 0;

    const data = this.getAvailableData();
    const clients = this.clients.map((client: Client) => (
        { sessionId: client.sessionId }
    ));
    const locked = this.locked;

    return { ...data, locked, clients, state, stateSize };
};

// Actions
(<any>Room.prototype)._forceClientDisconnect = async function (sessionId) {
    for (let i = 0; i < this.clients.length; i++) {
        if (this.clients[i].sessionId === sessionId) {
            this.clients[i].close();
            break;
        }
    }
};

(<any>Room.prototype)._sendMessageToClient = async function (sessionId, data) {
    for (let i = 0; i < this.clients.length; i++) {
        if (this.clients[i].sessionId === sessionId) {
            this.send(this.clients[i], data);
            break;
        }
    }
};
