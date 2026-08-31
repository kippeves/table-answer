import type * as Party from "partykit/server";

export default class Server implements Party.Server {
  constructor(public room: Party.Room) {}

  async onConnect(connection: Party.Connection) {
    connection.send(JSON.stringify({ type: "connected", roomId: this.room.id }));
  }

  async onMessage(message: string, connection: Party.Connection) {
    const data = JSON.parse(message);
    this.room.broadcast(JSON.stringify(data), [connection.id]);
  }
}
