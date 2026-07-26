"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ConfirmeEmail() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center">
          <p className="text-chalk/50 text-sm">Carregando...</p>
        </main>
      }
    >
      <ConfirmeEmailContent />
    </Suspense>
  );
}

function ConfirmeEmailContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";
  const supabase = createClient();

  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);

  async function handleResend() {
    if (!email) return;
    setResending(true);
    setResendError(null);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
    });
    setResending(false);
    if (error) {
      setResendError(error.message);
      return;
    }
    setResent(true);
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="bg-ink-light rounded-2xl p-8 w-full max-w-sm text-center">
        <span className="text-teal font-mono text-xs tracking-widest uppercase mb-3 block">
          Match Fit
        </span>
        <h1 className="font-display text-2xl uppercase tracking-wide mb-3">
          Confirme seu e-mail
        </h1>
        <p className="text-sm text-chalk/60 mb-1">
          Mandamos um link de confirmação pra
        </p>
        <p className="text-sm text-chalk font-medium mb-6">
          {email || "o e-mail que você cadastrou"}
        </p>
        <p className="text-xs text-chalk/50 mb-6">
          Clique no link do e-mail pra ativar sua conta. Se não encontrar,
          confere a caixa de spam também.
        </p>

        {email && (
          <button
            onClick={handleResend}
            disabled={resending || resent}
            className="w-full border border-teal/40 text-teal py-3 rounded-full hover:bg-teal/10 transition disabled:opacity-50"
          >
            {resending
              ? "Reenviando..."
              : resent
              ? "E-mail reenviado!"
              : "Reenviar e-mail"}
          </button>
        )}
        {resendError && (
          <p className="text-coral text-xs mt-2">{resendError}</p>
        )}

        <Link
          href="/login"
          className="block text-sm text-chalk/50 mt-6 hover:underline"
        >
          Já confirmou? Entrar
        </Link>
      </div>
    </main>
  );
}
