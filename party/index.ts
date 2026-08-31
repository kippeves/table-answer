import type * as Party from "partykit/server";
import { createEmptySession, type SessionState } from "../lib/types";

export default class Server implements Party.Server {
  state: SessionState | null = null;

  constructor(public room: Party.Room) {}

  async onStart() {
    this.state =
      (await this.room.storage.get<SessionState>("session")) ?? null;
  }

  async onRequest(request: Party.Request) {
    if (request.method === "POST") {
      const body = await request.json<{ name: string; maxTeams: number }>();
      this.state = createEmptySession(body.name, body.maxTeams);
      await this.room.storage.put("session", this.state);
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response("Method not allowed", { status: 405 });
  }

  async onConnect(connection: Party.Connection) {
    if (!this.state) {
      connection.send(
        JSON.stringify({ type: "error", message: "Sessionen hittades inte" })
      );
      connection.close();
      return;
    }
    connection.send(JSON.stringify({ type: "state", state: this.state }));
  }

  async onMessage(raw: string) {
    const msg = JSON.parse(raw);

    if (!this.state) return;

    if (msg.type === "cell") {
      const team = this.state.teams[msg.teamNumber];
      if (team) {
        team.cells[msg.key as `${number}-${number}`] = msg.value;
        await this.room.storage.put("session", this.state);
        this.room.broadcast(
          JSON.stringify({
            type: "cell",
            teamNumber: msg.teamNumber,
            key: msg.key,
            value: msg.value,
          })
        );
      }
      return;
    }

    if (msg.type === "complete") {
      const team = this.state.teams[msg.teamNumber];
      if (team) {
        team.completed = true;
        await this.room.storage.put("session", this.state);
        this.room.broadcast(
          JSON.stringify({
            type: "complete",
            teamNumber: msg.teamNumber,
          })
        );
      }
      return;
    }

    if (msg.type === "close") {
      await this.room.storage.delete("session");
      this.state = null;
      this.room.broadcast(JSON.stringify({ type: "closed" }));
      return;
    }
  }
}
