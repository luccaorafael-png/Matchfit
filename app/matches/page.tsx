"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/client";
import { fetchMatchesForUser, MatchSummary } from "@/lib/queries";
import UserMenu from "@/components/UserMenu";

export default function Matches() {
  const { user, loading: userLoading } = useSession();
  const supabase = createClient();
  const [matches, setMatches] = useState<MatchSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function load() {
    if (!user) return;
    setLoading(true);
    const result = await fetchMatchesForUser(supabase, user.id);
    setMatches(result.data);
    setLoadError(result.error);
    setLoading(false);
  }

  if (userLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-chalk/50 text-sm">Carregando...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center px-6 py-10">
      <div className="flex items-center justify-between w-full max-w-sm mb-6">
        <Link href="/match" className="text-chalk/50 text-sm">
          ← Voltar ao match
        </Link>
        <UserMenu />
      </div>

      <h1 className="font-display text-xl uppercase tracking-wide mb-6 w-full max-w-sm">
        Seus matches
      </h1>

      <div className="w-full max-w-sm space-y-3">
        {loading ? (
          <p className="text-chalk/50 text-sm text-center">Buscando matches...</p>
        ) : loadError ? (
          <div className="text-center">
            <p className="text-coral text-sm mb-3 break-words">{loadError}</p>
            <button
              onClick={load}
              className="text-xs text-teal border border-teal/40 rounded-full px-4 py-2 hover:bg-teal/10 transition"
            >
              Tentar de novo
            </button>
          </div>
        ) : matches.length === 0 ? (
          <p className="text-chalk/50 text-sm text-center">
            Você ainda não tem nenhum match. Continue dando swipe em{" "}
            <Link href="/match" className="text-teal">
              /match
            </Link>
            .
          </p>
        ) : (
          matches.map((m) => (
            <Link
              key={m.matchId}
              href={`/chat/${m.matchId}`}
              className="flex items-center justify-between bg-ink-light rounded-xl px-4 py-3 hover:bg-ink-lighter transition"
            >
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-full bg-coral/20 border border-coral/40 flex items-center justify-center text-xs font-medium text-coral">
                  {m.otherUserName
                    .split(" ")
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase()}
                </span>
                <span className="text-sm text-chalk">{m.otherUserName}</span>
              </div>
              <span className="text-teal text-xs">Conversar →</span>
            </Link>
          ))
        )}
      </div>
    </main>
  );
}
