"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CreatePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [maxTeams, setMaxTeams] = useState(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, maxTeams }),
    });

    let data;
    try {
      data = await res.json();
    } catch {
      setError("Kunde inte tolka serverns svar");
      setLoading(false);
      return;
    }

    if (!res.ok) {
      setError(data.error || "Något gick fel");
      setLoading(false);
      return;
    }

    router.push(`/dashboard/${data.code}`);
  }

  return (
    <div className="flex flex-col flex-1 items-center justify-center px-6 py-32">
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-6 w-full max-w-sm"
      >
        <h1 className="text-2xl font-bold text-zinc-900 text-center">
          Skapa session
        </h1>

        <div className="flex flex-col gap-2">
          <label htmlFor="name" className="text-sm font-medium text-zinc-700">
            Sessionsnamn
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="t.ex. Lektion 3"
            required
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-500"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label
            htmlFor="maxTeams"
            className="text-sm font-medium text-zinc-700"
          >
            Max antal lag
          </label>
          <select
            id="maxTeams"
            value={maxTeams}
            onChange={(e) => setMaxTeams(Number(e.target.value))}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-500"
          >
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading || !name.trim()}
          className="rounded-lg bg-zinc-900 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50"
        >
          {loading ? "Skapar..." : "Skapa session"}
        </button>
      </form>
    </div>
  );
}
