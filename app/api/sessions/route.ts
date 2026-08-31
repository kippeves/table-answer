import { NextResponse } from "next/server";
import { generateSessionCode } from "@/lib/session-code";

const PARTYKIT_HOST =
  process.env.NEXT_PUBLIC_PARTYKIT_HOST ?? "127.0.0.1:1999";

export async function POST(request: Request) {
  const { name, maxTeams } = await request.json();

  if (!name || typeof name !== "string") {
    return NextResponse.json({ error: "Namn krävs" }, { status: 400 });
  }
  if (typeof maxTeams !== "number" || maxTeams < 1 || maxTeams > 10) {
    return NextResponse.json(
      { error: "Max lag måste vara mellan 1 och 10" },
      { status: 400 }
    );
  }

  const code = generateSessionCode();

  try {
    const res = await fetch(`http://${PARTYKIT_HOST}/party/${code}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, maxTeams }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("PartyKit POST failed:", res.status, text);
      return NextResponse.json(
        { error: `Kunde inte skapa session (${res.status})` },
        { status: 500 }
      );
    }

    return NextResponse.json({ code });
  } catch (err) {
    console.error("PartyKit fetch error:", err);
    return NextResponse.json(
      { error: "Kunde inte ansluta till PartyKit" },
      { status: 500 }
    );
  }
}
