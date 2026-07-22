"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/client";
import {
  fetchMessages,
  sendMessage,
  fetchMatchesForUser,
  fetchSessions,
  proposeSession,
  respondToSession,
  ChatMessage,
  SessionProposal,
} from "@/lib/queries";

export default function Chat() {
  const params = useParams();
  const matchId = params.matchId as string;
  const { user, loading: userLoading } = useSession();
  const supabase = createClient();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [otherName, setOtherName] = useState<string>("");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sessions, setSessions] = useState<SessionProposal[]>([]);
  const [showProposeForm, setShowProposeForm] = useState(false);
  const [proposeDate, setProposeDate] = useState("");
  const [proposeTime, setProposeTime] = useState("");
  const [proposeError, setProposeError] = useState<string | null>(null);
  const [proposing, setProposing] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  function reloadSessions() {
    fetchSessions(supabase, matchId).then((result) => setSessions(result.data));
  }

  useEffect(() => {
    if (!user) return;

    fetchMessages(supabase, matchId).then((result) => {
      setMessages(result.data);
      setLoadError(result.error);
      setLoading(false);
    });

    fetchMatchesForUser(supabase, user.id).then((result) => {
      const found = result.data.find((m) => m.matchId === matchId);
      if (found) setOtherName(found.otherUserName);
    });

    reloadSessions();

    const sessionsChannel = supabase
      .channel(`sessions:${matchId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "sessions",
          filter: `match_id=eq.${matchId}`,
        },
        () => reloadSessions()
      )
      .subscribe();

    // Escuta novas mensagens em tempo real pra essa conversa.
    const channel = supabase
      .channel(`messages:${matchId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `match_id=eq.${matchId}`,
        },
        (payload) => {
          const row = payload.new as any;
          setMessages((prev) => {
            if (prev.some((m) => m.id === row.id)) return prev;
            return [
              ...prev,
              {
                id: row.id,
                matchId: row.match_id,
                senderId: row.sender_id,
                content: row.content,
                createdAt: row.created_at,
              },
            ];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(sessionsChannel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, matchId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || !user) return;
    const content = text.trim().slice(0, 2000);
    setText("");
    const { error } = await sendMessage(supabase, matchId, user.id, content);
    if (error) setLoadError(error);
    // A própria mensagem também chega pelo Realtime — não precisa adicionar
    // otimisticamente aqui.
  }

  async function handlePropose(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !proposeDate || !proposeTime) return;
    setProposeError(null);
    setProposing(true);
    const scheduledAt = new Date(`${proposeDate}T${proposeTime}`);
    if (scheduledAt.getTime() < Date.now()) {
      setProposeError("Escolha uma data e horário no futuro.");
      setProposing(false);
      return;
    }
    const { error } = await proposeSession(
      supabase,
      matchId,
      user.id,
      scheduledAt.toISOString()
    );
    setProposing(false);
    if (error) {
      setProposeError(error);
      return;
    }
    setProposeDate("");
    setProposeTime("");
    setShowProposeForm(false);
    reloadSessions();
  }

  async function handleRespond(
    sessionId: string,
    status: "confirmed" | "declined" | "cancelled"
  ) {
    await respondToSession(supabase, sessionId, status);
    reloadSessions();
  }

  if (userLoading || !user) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-chalk/50 text-sm">Carregando...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center px-6 py-10">
      <div className="w-full max-w-sm mb-4 flex items-center justify-between">
        <Link href="/matches" className="text-chalk/50 text-sm">
          ← Seus matches
        </Link>
        {otherName && (
          <span className="text-sm text-chalk/80 font-medium">
            {otherName}
          </span>
        )}
      </div>

      {sessions.length > 0 && (
        <div className="w-full max-w-sm space-y-2 mb-3">
          {sessions
            .filter((s) => s.status === "pending" || s.status === "confirmed")
            .map((s) => {
              const isProposer = s.proposedBy === user.id;
              const dateLabel = new Date(s.scheduledAt).toLocaleString("pt-BR", {
                dateStyle: "short",
                timeStyle: "short",
              });
              return (
                <div
                  key={s.id}
                  className="bg-ink-light rounded-xl px-4 py-3 flex items-center justify-between gap-2"
                >
                  <div>
                    <p className="text-sm text-chalk">
                      {s.status === "confirmed" ? "✓ Sessão confirmada" : "Sessão proposta"}
                    </p>
                    <p className="text-xs text-chalk/50">{dateLabel}</p>
                  </div>
                  {s.status === "pending" && !isProposer && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleRespond(s.id, "confirmed")}
                        className="text-xs bg-teal text-ink px-3 py-1 rounded-full hover:bg-teal-dark transition"
                      >
                        Confirmar
                      </button>
                      <button
                        onClick={() => handleRespond(s.id, "declined")}
                        className="text-xs border border-chalk/20 text-chalk/60 px-3 py-1 rounded-full hover:bg-ink transition"
                      >
                        Recusar
                      </button>
                    </div>
                  )}
                  {s.status === "pending" && isProposer && (
                    <button
                      onClick={() => handleRespond(s.id, "cancelled")}
                      className="text-xs text-chalk/50 hover:underline"
                    >
                      Cancelar
                    </button>
                  )}
                  {s.status === "confirmed" && (
                    <button
                      onClick={() => handleRespond(s.id, "cancelled")}
                      className="text-xs text-chalk/50 hover:underline"
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              );
            })}
        </div>
      )}

      {user.subscriptionActive && (
        <div className="w-full max-w-sm mb-3">
          {showProposeForm ? (
            <form
              onSubmit={handlePropose}
              className="bg-ink-light rounded-xl p-4 space-y-2"
            >
              <p className="text-xs text-chalk/60 mb-1">Marcar sessão</p>
              <div className="flex gap-2">
                <input
                  type="date"
                  required
                  value={proposeDate}
                  onChange={(e) => setProposeDate(e.target.value)}
                  className="flex-1 bg-ink text-chalk border border-chalk/20 rounded-lg px-3 py-2 text-sm outline-none focus:border-coral"
                />
                <input
                  type="time"
                  required
                  value={proposeTime}
                  onChange={(e) => setProposeTime(e.target.value)}
                  className="flex-1 bg-ink text-chalk border border-chalk/20 rounded-lg px-3 py-2 text-sm outline-none focus:border-coral"
                />
              </div>
              {proposeError && (
                <p className="text-coral text-xs">{proposeError}</p>
              )}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={proposing}
                  className="flex-1 bg-coral text-ink text-sm font-medium py-2 rounded-full hover:bg-coral-dark transition disabled:opacity-50"
                >
                  {proposing ? "Enviando..." : "Propor horário"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowProposeForm(false)}
                  className="text-sm text-chalk/50 px-3"
                >
                  Cancelar
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setShowProposeForm(true)}
              className="w-full text-sm border border-teal/40 text-teal py-2 rounded-full hover:bg-teal/10 transition"
            >
              Marcar sessão
            </button>
          )}
        </div>
      )}

      <div className="w-full max-w-sm flex-1 flex flex-col bg-ink-light rounded-2xl p-4 h-[60vh]">
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {loading ? (
            <p className="text-chalk/50 text-sm text-center mt-4">
              Carregando conversa...
            </p>
          ) : loadError ? (
            <p className="text-coral text-sm text-center mt-4 break-words">
              {loadError}
            </p>
          ) : messages.length === 0 ? (
            <p className="text-chalk/50 text-sm text-center mt-4">
              Vocês deram match! Manda a primeira mensagem.
            </p>
          ) : (
            messages.map((m) => {
              const isMine = m.senderId === user.id;
              return (
                <div
                  key={m.id}
                  className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                >
                  <span
                    className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${
                      isMine
                        ? "bg-coral text-ink rounded-br-sm"
                        : "bg-ink text-chalk rounded-bl-sm"
                    }`}
                  >
                    {m.content}
                  </span>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        {user.subscriptionActive ? (
          <form onSubmit={handleSend} className="flex gap-2 mt-3">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Escreva uma mensagem..."
              maxLength={2000}
              className="flex-1 bg-ink text-chalk border border-chalk/20 rounded-full px-4 py-2 text-sm outline-none focus:border-coral"
            />
            <button
              type="submit"
              className="bg-coral text-ink px-4 rounded-full text-sm font-medium hover:bg-coral-dark transition"
            >
              Enviar
            </button>
          </form>
        ) : (
          <div className="mt-3 bg-ink rounded-xl p-3 text-center">
            <p className="text-xs text-chalk/60 mb-2">
              Assine pra conversar com {otherName || "essa pessoa"}.
            </p>
            <Link
              href="/planos"
              className="inline-block bg-coral text-ink text-xs font-medium px-4 py-2 rounded-full hover:bg-coral-dark transition"
            >
              Ver planos
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
