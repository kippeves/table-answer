"use client";

import { useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import usePartySocket from "partysocket/react";
import {
  BOARD_TEMPLATE,
  type SessionState,
  type CellKey,
} from "@/lib/types";

const PARTYKIT_HOST =
  process.env.NEXT_PUBLIC_PARTYKIT_HOST ?? "127.0.0.1:1999";

export default function DashboardPage() {
  const params = useParams();
  const code = params.code as string;

  const [state, setState] = useState<SessionState | null>(null);
  const [closed, setClosed] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);

  const socket = usePartySocket({
    host: PARTYKIT_HOST,
    room: code,
    onMessage(event) {
      let msg;
      try {
        msg = JSON.parse(event.data);
      } catch {
        return;
      }

      if (msg.type === "state") {
        setState(msg.state);
      }

      if (msg.type === "error") {
        setNotFound(true);
      }

      if (msg.type === "closed") {
        setClosed(true);
      }

      if (msg.type === "cell" || msg.type === "complete") {
        setState((prev) => {
          if (!prev) return prev;
          const teams = { ...prev.teams };
          const team = { ...teams[msg.teamNumber] };
          if (msg.type === "cell") {
            team.cells = { ...team.cells, [msg.key]: msg.value };
          } else {
            team.completed = true;
          }
          teams[msg.teamNumber] = team;
          return { ...prev, teams };
        });
      }
    },
  });

  const closeSession = useCallback(() => {
    socket.send(JSON.stringify({ type: "close" }));
  }, [socket]);

  if (notFound) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center gap-4">
        <h1 className="text-2xl font-bold text-zinc-900">
          Sessionen hittades inte
        </h1>
        <Link href="/" className="text-sm text-zinc-600 underline">
          Tillbaka till startsidan
        </Link>
      </div>
    );
  }

  if (closed) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center gap-4">
        <h1 className="text-2xl font-bold text-zinc-900">
          Sessionen avslutad
        </h1>
        <Link href="/" className="text-sm text-zinc-600 underline">
          Tillbaka till startsidan
        </Link>
      </div>
    );
  }

  if (!state) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center">
        <p className="text-zinc-500">Ansluter...</p>
      </div>
    );
  }

  const teams = Object.entries(state.teams);
  const completedCount = teams.filter(([, t]) => t.completed).length;
  const viewedTeam = selectedTeam ? state.teams[selectedTeam] : null;

  return (
    <div className="flex flex-col flex-1 items-center px-6 py-8">
      <div className="w-full max-w-4xl flex flex-col gap-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">{state.name}</h1>
            <p className="text-sm text-zinc-500">
              Kodd:{" "}
              <span className="font-mono font-semibold text-zinc-700">
                {code}
              </span>{" "}
              &middot; Max lag: {state.maxTeams}
            </p>
            <p className="text-sm text-zinc-500 mt-1">
              Dela denna länk:{" "}
              <span className="font-mono text-zinc-700">
                {typeof window !== "undefined" ? window.location.origin : ""}/join
              </span>
            </p>
          </div>
          <button
            onClick={closeSession}
            className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
          >
            Avsluta session
          </button>
        </div>

        <div className="text-sm text-zinc-600">
          {completedCount} av {teams.length} lag klara
        </div>

        {selectedTeam && viewedTeam ? (
          <div className="flex flex-col gap-4">
            <button
              onClick={() => setSelectedTeam(null)}
              className="text-sm text-zinc-600 underline hover:text-zinc-900 self-start"
            >
              ← Tillbaka till alla lag
            </button>

            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-zinc-900">
                Lag {selectedTeam}
              </h2>
              {viewedTeam.completed && (
                <span className="text-sm text-green-600 font-medium">Klar</span>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="border border-zinc-300 bg-zinc-100 px-4 py-3 text-left text-sm font-semibold text-zinc-700">
                      Fråga
                    </th>
                    {BOARD_TEMPLATE.columns.map((col, ci) => (
                      <th
                        key={col}
                        title={BOARD_TEMPLATE.columnTooltips[ci]}
                        className="border border-zinc-300 bg-zinc-100 px-4 py-3 text-center text-sm font-semibold text-zinc-700"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {BOARD_TEMPLATE.rows.map((row, ri) => (
                    <tr key={ri}>
                      <td
                        title={BOARD_TEMPLATE.rowTooltips[ri]}
                        className="border border-zinc-300 bg-zinc-50 px-4 py-3 text-sm font-medium text-zinc-700 whitespace-nowrap"
                      >
                        {row}
                      </td>
                      {BOARD_TEMPLATE.columns.map((_, ci) => {
                        const key: CellKey = `${ri}-${ci}`;
                        return (
                          <td
                            key={ci}
                            className="border border-zinc-300 px-3 py-2 text-sm text-center text-zinc-800"
                          >
                            {viewedTeam.cells[key] || (
                              <span className="text-zinc-300">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {teams.map(([num, team]) => (
              <button
                key={num}
                onClick={() => setSelectedTeam(num)}
                className={`rounded-xl border-2 px-5 py-4 flex items-center gap-3 transition-colors text-left hover:shadow-md ${
                  team.completed
                    ? "border-green-300 bg-green-50"
                    : "border-zinc-200 bg-white"
                }`}
              >
                <span
                  className={`text-2xl ${team.completed ? "text-green-600" : "text-zinc-300"}`}
                >
                  {team.completed ? "✓" : "○"}
                </span>
                <div>
                  <div className="text-sm font-semibold text-zinc-800">
                    Lag {num}
                  </div>
                  <div className="text-xs text-zinc-500">
                    {team.completed ? "Klar" : "Pågår"}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
