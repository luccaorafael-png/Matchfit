"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function Login() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError("E-mail ou senha inválidos.");
        setSubmitting(false);
        return;
      }

      window.location.href = "/match";
    } catch (err: any) {
      console.error("[login] erro inesperado:", err);
      setError(
        `Erro inesperado: ${err?.message ?? "verifique o console do navegador (F12) e me envie o que aparecer."}`
      );
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <form
        onSubmit={handleSubmit}
        className="bg-ink-light rounded-2xl p-8 w-full max-w-md"
      >
        <h1 className="font-display text-2xl uppercase tracking-wide mb-6">
          Entrar
        </h1>

        <label className="block text-sm text-chalk/70 mb-1">E-mail</label>
        <input
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="voce@email.com"
          className="w-full bg-ink text-chalk border border-chalk/20 rounded-lg px-4 py-2 mb-4 outline-none focus:border-coral"
        />

        <label className="block text-sm text-chalk/70 mb-1">Senha</label>
        <input
          required
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full bg-ink text-chalk border border-chalk/20 rounded-lg px-4 py-2 mb-5 outline-none focus:border-coral"
        />

        {error && (
          <p className="text-coral text-sm mb-4 text-center">{error}</p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-coral text-ink font-medium py-3 rounded-full hover:bg-coral-dark transition disabled:opacity-50"
        >
          {submitting ? "Entrando..." : "Entrar"}
        </button>

        <p className="text-center text-xs text-chalk/50 mt-4">
          Não tem conta?{" "}
          <a href="/cadastro" className="text-teal">
            Criar conta
          </a>
        </p>
      </form>
    </main>
  );
}
