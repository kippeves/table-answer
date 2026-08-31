import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center px-6 py-32">
      <main className="flex flex-col items-center gap-8 text-center max-w-lg">
        <h1 className="text-4xl font-bold tracking-tight text-zinc-900">
          Table Answer
        </h1>
        <p className="text-lg text-zinc-600 leading-relaxed">
          Collaborativ verktyg för undervisning. Skapa en session och fyll i
          tabellen tillsammans.
        </p>
        <div className="flex gap-3">
          <Link
            href="/create"
            className="rounded-lg bg-zinc-900 px-6 py-3 text-base font-medium text-white transition-colors hover:bg-zinc-700"
          >
            Skapa session
          </Link>
          <Link
            href="/session"
            className="rounded-lg border border-zinc-300 px-6 py-3 text-base font-medium text-zinc-700 transition-colors hover:bg-zinc-100"
          >
            Gå med
          </Link>
        </div>
      </main>
    </div>
  );
}
