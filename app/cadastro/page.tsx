"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserRole, TrainingMode } from "@/lib/data";
import { createClient } from "@/lib/supabase/client";
import { CREF_REGIONS } from "@/lib/cref";
import { isAllowedEmailDomain } from "@/lib/email-validation";

export default function Cadastro() {
  const router = useRouter();
  const supabase = createClient();

  const [role, setRole] = useState<UserRole>("cliente");
  const [mode, setMode] = useState<TrainingMode | "ambos">("ambos");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [price, setPrice] = useState(80);
  const [crefNumber, setCrefNumber] = useState("");
  const [crefRegion, setCrefRegion] = useState("");
  const [goal, setGoal] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!isAllowedEmailDomain(email)) {
      setError(
        "Use um e-mail de um provedor conhecido (Gmail, Outlook, Yahoo, iCloud, etc). E-mails temporários ou de domínios desconhecidos não são aceitos."
      );
      return;
    }

    setSubmitting(true);

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError || !data.user) {
        setError(signUpError?.message ?? "Não foi possível criar a conta.");
        setSubmitting(false);
        return;
      }

      if (!data.session) {
        window.location.href = `/confirme-email?email=${encodeURIComponent(email)}`;
        return;
      }

      const userId = data.user.id;

      const { error: profileError } = await supabase.from("profiles").insert({
        id: userId,
        name,
        role,
        preferred_mode: mode,
      });

      if (profileError) {
        setError(profileError.message);
        setSubmitting(false);
        return;
      }

      const modesArray: TrainingMode[] =
        mode === "ambos" ? ["presencial", "online"] : [mode];

      if (role === "personal") {
        const { error: trainerError } = await supabase
          .from("trainer_profiles")
          .insert({
            user_id: userId,
            specialty,
            price_per_session: price,
            cref_number: crefNumber,
            cref_region: crefRegion,
            modes: modesArray,
          });
        if (trainerError) {
          setError(
            `Conta criada, mas o perfil de treinador falhou: ${trainerError.message}`
          );
          setSubmitting(false);
          return;
        }
      } else {
        const { error: clientError } = await supabase
          .from("client_profiles")
          .insert({
            user_id: userId,
            goal,
            modes: modesArray,
          });
        if (clientError) {
          setError(
            `Conta criada, mas o perfil de cliente falhou: ${clientError.message}`
          );
          setSubmitting(false);
          return;
        }
      }

      window.location.href = "/match";
    } catch (err: any) {
      console.error("[cadastro] erro inesperado:", err);
      setError(
        `Erro inesperado: ${err?.message ?? "verifique o console do navegador (F12) e me envie o que aparecer."}`
      );
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-10">
      <form
        onSubmit={handleSubmit}
        className="bg-ink-light rounded-2xl p-8 w-full max-w-md"
      >
        <h1 className="font-display text-2xl uppercase tracking-wide mb-6">
          Criar conta
        </h1>

        <label className="block text-sm text-chalk/70 mb-1">Nome</label>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Seu nome"
          className="w-full bg-ink text-chalk border border-chalk/20 rounded-lg px-4 py-2 mb-4 outline-none focus:border-coral"
        />

        <label className="block text-sm text-chalk/70 mb-1">E-mail</label>
        <input
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="voce@email.com"
          className="w-full bg-ink text-chalk border border-chalk/20 rounded-lg px-4 py-2 mb-1 outline-none focus:border-coral"
        />
        <p className="text-xs text-chalk/40 mb-4">
          Gmail, Outlook, Yahoo, iCloud, etc. — sem e-mails temporários.
        </p>

        <label className="block text-sm text-chalk/70 mb-1">Senha</label>
        <input
          required
          type="password"
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Mínimo 8 caracteres"
          className="w-full bg-ink text-chalk border border-chalk/20 rounded-lg px-4 py-2 mb-5 outline-none focus:border-coral"
        />

        <label className="block text-sm text-chalk/70 mb-2">Eu sou</label>
        <div className="flex gap-3 mb-5">
          <button
            type="button"
            onClick={() => setRole("cliente")}
            className={`flex-1 py-2 rounded-lg border text-sm ${
              role === "cliente"
                ? "border-coral text-coral"
                : "border-chalk/20 text-chalk/60"
            }`}
          >
            Cliente
          </button>
          <button
            type="button"
            onClick={() => setRole("personal")}
            className={`flex-1 py-2 rounded-lg border text-sm ${
              role === "personal"
                ? "border-coral text-coral"
                : "border-chalk/20 text-chalk/60"
            }`}
          >
            Personal trainer
          </button>
        </div>

        <label className="block text-sm text-chalk/70 mb-2">
          Modalidade de treino
        </label>
        <div className="flex gap-2 mb-5">
          {(["presencial", "online", "ambos"] as const).map((m) => (
            <button
              type="button"
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 py-2 rounded-lg border text-xs capitalize ${
                mode === m
                  ? "border-teal text-teal"
                  : "border-chalk/20 text-chalk/60"
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        {role === "personal" ? (
          <>
            <label className="block text-sm text-chalk/70 mb-1">
              Especialidade
            </label>
            <input
              required
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              placeholder="Ex: Hipertrofia"
              className="w-full bg-ink text-chalk border border-chalk/20 rounded-lg px-4 py-2 mb-4 outline-none focus:border-coral"
            />
            <label className="block text-sm text-chalk/70 mb-1">
              Preço por sessão (R$)
            </label>
            <input
              required
              type="number"
              min={0}
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
              className="w-full bg-ink text-chalk border border-chalk/20 rounded-lg px-4 py-2 mb-4 outline-none focus:border-coral"
            />

            <label className="block text-sm text-chalk/70 mb-1">
              Número do CREF
            </label>
            <input
              required
              value={crefNumber}
              onChange={(e) => setCrefNumber(e.target.value)}
              placeholder="Ex: 012345-G"
              className="w-full bg-ink text-chalk border border-chalk/20 rounded-lg px-4 py-2 mb-4 outline-none focus:border-coral"
            />

            <label className="block text-sm text-chalk/70 mb-1">
              Região do CREF
            </label>
            <select
              required
              value={crefRegion}
              onChange={(e) => setCrefRegion(e.target.value)}
              className="w-full bg-ink text-chalk border border-chalk/20 rounded-lg px-4 py-2 mb-2 outline-none focus:border-coral"
            >
              <option value="">Selecione</option>
              {CREF_REGIONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-chalk/40 mb-5">
              Sua conta fica com um selo de "verificado" depois que
              conferirmos seu CREF manualmente — geralmente rápido.
            </p>
          </>
        ) : (
          <>
            <label className="block text-sm text-chalk/70 mb-1">
              Seu objetivo
            </label>
            <input
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="Ex: Emagrecimento"
              className="w-full bg-ink text-chalk border border-chalk/20 rounded-lg px-4 py-2 mb-5 outline-none focus:border-coral"
            />
          </>
        )}

        <div className="bg-ink rounded-lg p-4 mb-6 text-sm text-chalk/70">
          {role === "cliente"
            ? "Assinatura do cliente: acesso ilimitado para buscar e conversar com treinadores."
            : "Assinatura do personal trainer: seu perfil aparece nas buscas e recebe matches de clientes."}
        </div>

        {error && (
          <p className="text-coral text-sm mb-4 text-center">{error}</p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-coral text-ink font-medium py-3 rounded-full hover:bg-coral-dark transition disabled:opacity-50"
        >
          {submitting ? "Criando conta..." : "Criar conta"}
        </button>

        <p className="text-center text-xs text-chalk/50 mt-4">
          Já tem conta?{" "}
          <a href="/login" className="text-teal">
            Entrar
          </a>
        </p>
      </form>
    </main>
  );
}
