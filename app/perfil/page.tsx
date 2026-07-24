"use client";

import Link from "next/link";
import { useSession } from "@/lib/session";

export default function Perfil() {
  const { user, loading, error } = useSession();

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-chalk/50 text-sm">Carregando...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6">
        <p className="text-coral text-sm text-center max-w-xs">{error}</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6">
        <p className="text-chalk/50 text-sm text-center">
          Você precisa entrar na conta.{" "}
          <Link href="/login" className="text-teal">
            Entrar
          </Link>
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center px-6 py-10">
      <div className="w-full max-w-sm mb-6">
        <Link href="/match" className="text-chalk/50 text-sm">
          ← Voltar ao match
        </Link>
      </div>

      <div className="bg-ink-light rounded-2xl p-6 w-full max-w-sm">
        <div className="w-20 h-20 rounded-full bg-coral/20 border border-coral/40 flex items-center justify-center mx-auto mb-4 overflow-hidden">
          {user.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.avatarUrl}
              alt={user.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-2xl font-medium text-coral">
              {user.name
                .split(" ")
                .map((n) => n[0])
                .slice(0, 2)
                .join("")
                .toUpperCase()}
            </span>
          )}
        </div>

        <h1 className="font-display text-xl uppercase tracking-wide mb-4 text-center">
          {user.name}
        </h1>

        <div className="space-y-3 text-sm">
          <div className="flex justify-between text-chalk/70">
            <span>Tipo de conta</span>
            <span className="capitalize text-chalk">{user.role}</span>
          </div>
          <div className="flex justify-between text-chalk/70">
            <span>Modalidade preferida</span>
            <span className="capitalize text-chalk">
              {user.preferredMode}
            </span>
          </div>
          <div className="flex justify-between text-chalk/70">
            <span>Assinatura</span>
            <span
              className={user.subscriptionActive ? "text-teal" : "text-coral"}
            >
              {user.subscriptionActive ? "Ativa" : "Inativa"}
            </span>
          </div>
        </div>

        {!user.subscriptionActive && (
          <Link
            href="/planos"
            className="block w-full text-center bg-coral text-ink font-medium py-3 rounded-full mt-6 hover:bg-coral-dark transition"
          >
            Assinar agora
          </Link>
        )}
      </div>
    </main>
  );
}
