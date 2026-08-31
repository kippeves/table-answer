"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function JoinPage() {
  const router = useRouter();
  const [code, setCode] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = code.trim().toLowerCase();
    if (trimmed) {
      router.push(`/session/${trimmed}`);
    }
  }

  return (
    <div className="flex flex-col flex-1 items-center justify-center px-6 py-32">
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-6 w-full max-w-sm"
      >
        <h1 className="text-2xl font-bold text-zinc-900 text-center">
          Gå med i session
        </h1>

        <div className="flex flex-col gap-2">
          <label htmlFor="code" className="text-sm font-medium text-zinc-700">
            Sessionskod
          </label>
          <input
            id="code"
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="t.ex. k7mz2x"
            autoFocus
            required
            className="rounded-lg border border-zinc-300 px-4 py-3 text-base text-center font-mono tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-zinc-500"
          />
        </div>

        <button
          type="submit"
          disabled={!code.trim()}
          className="rounded-lg bg-zinc-900 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50"
        >
          Gå med
        </button>
      </form>
    </div>
  );
}
