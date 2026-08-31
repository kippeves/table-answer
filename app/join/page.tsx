"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function JoinPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/session");
  }, [router]);

  return (
    <div className="flex flex-col flex-1 items-center justify-center">
      <p className="text-zinc-500">Du omdirigeras...</p>
    </div>
  );
}
