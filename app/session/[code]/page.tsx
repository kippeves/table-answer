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

export default function SessionPage() {
  const params = useParams();
  const code = params.code as string;

  const [state, setState] = useState<SessionState | null>(null);
  const [teamNumber, setTeamNumber] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(`team-${code}`);
  });
  const [showPicker, setShowPicker] = useState(() => {
    if (typeof window === "undefined") return true;
    return !localStorage.getItem(`team-${code}`);
  });
  const [closed, setClosed] = useState(false);
  const [notFound, setNotFound] = useState(false);

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

      if (msg.type === "cell" && teamNumber === String(msg.teamNumber)) {
        setState((prev) => {
          if (!prev) return prev;
          const teams = { ...prev.teams };
          const team = { ...teams[msg.teamNumber] };
          team.cells = { ...team.cells, [msg.key]: msg.value };
          teams[msg.teamNumber] = team;
          return { ...prev, teams };
        });
      }

      if (msg.type === "complete" && teamNumber === String(msg.teamNumber)) {
        setState((prev) => {
          if (!prev) return prev;
          const teams = { ...prev.teams };
          const team = { ...teams[msg.teamNumber] };
          team.completed = true;
          teams[msg.teamNumber] = team;
          return { ...prev, teams };
        });
      }
    },
  });

  const sendCell = useCallback(
    (key: CellKey, value: string) => {
      if (!teamNumber) return;
      socket.send(
        JSON.stringify({
          type: "cell",
          teamNumber: Number(teamNumber),
          key,
          value,
        })
      );
    },
    [socket, teamNumber]
  );

  const sendComplete = useCallback(() => {
    if (!teamNumber) return;
    socket.send(
      JSON.stringify({ type: "complete", teamNumber: Number(teamNumber) })
    );
  }, [socket, teamNumber]);

  const selectTeam = (num: string) => {
    setTeamNumber(num);
    localStorage.setItem(`team-${code}`, num);
    setShowPicker(false);
  };

  const switchTeam = () => {
    setShowPicker(true);
  };

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

  const myBoard = teamNumber ? state.teams[teamNumber] : undefined;

  return (
    <div className="flex flex-col flex-1 items-center px-6 py-8">
      <div className="w-full max-w-4xl flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">{state.name}</h1>
            <p className="text-sm text-zinc-500">
              Lag {teamNumber} &middot; Kodd: {code}
            </p>
          </div>
          <button
            onClick={switchTeam}
            className="text-sm text-zinc-600 underline hover:text-zinc-900"
          >
            Byt lag
          </button>
        </div>

        {showPicker && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-8 shadow-xl flex flex-col gap-4">
              <h2 className="text-lg font-semibold text-zinc-900 text-center">
                Välj ditt lag
              </h2>
              <div className="grid grid-cols-5 gap-2">
                {Array.from({ length: state.maxTeams }, (_, i) => i + 1).map(
                  (n) => (
                    <button
                      key={n}
                      onClick={() => selectTeam(String(n))}
                      className="rounded-lg border border-zinc-300 px-4 py-3 text-sm font-medium hover:bg-zinc-100 transition-colors"
                    >
                      Lag {n}
                    </button>
                  )
                )}
              </div>
            </div>
          </div>
        )}

        {myBoard && (
          <>
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
                            className="border border-zinc-300 p-1.5"
                          >
                            <input
                              type="text"
                              value={myBoard.cells[key] ?? ""}
                              onChange={(e) => sendCell(key, e.target.value)}
                              className="w-full px-3 py-3 text-base text-center focus:outline-none focus:ring-2 focus:ring-zinc-400 rounded"
                              placeholder="—"
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-center">
              {myBoard.completed ? (
                <span className="text-sm text-green-600 font-medium">
                  ✓ Klar
                </span>
              ) : (
                <button
                  onClick={sendComplete}
                  className="rounded-lg bg-green-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-green-700"
                >
                  Klar
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
