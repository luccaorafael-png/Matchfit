"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useSession } from "@/lib/session";

type PlanInfo = { price: string | null; interval: string } | null;

const FEATURES: Record<"cliente" | "personal", string[]> = {
  cliente: [
    "Curta perfis ilimitados",
    "Converse com todos os treinadores que derem match",
    "Filtre por preço, especialidade e distância",
    "Cancele quando quiser",
  ],
  personal: [
    "Apareça nas buscas dos clientes da sua região",
    "Curta e receba matches ilimitados",
    "Converse com todos os seus matches",
    "Cancele quando quiser",
  ],
};

export default function Planos() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center">
          <p className="text-chalk/50 text-sm">Carregando...</p>
        </main>
      }
    >
      <PlanosContent />
    </Suspense>
  );
}

function PlanosContent() {
  const { user, loading, refreshProfile } = useSession();
  const searchParams = useSearchParams();
  const [plans, setPlans] = useState<{ cliente: PlanInfo; personal: PlanInfo }>({
    cliente: null,
    personal: null,
  });
  const [plansLoading, setPlansLoading] = useState(true);
  const [billingLoading, setBillingLoading] = useState(false);
  const [billingError, setBillingError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [synced, setSynced] = useState(false);

  const assinaturaStatus = searchParams.get("assinatura");
  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    fetch("/api/plans")
      .then((res) => res.json())
      .then(setPlans)
      .catch(() => {})
      .finally(() => setPlansLoading(false));
  }, []);

  useEffect(() => {
    if (assinaturaStatus === "sucesso" && sessionId && !synced && user) {
      setSyncing(true);
      fetch("/api/checkout/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      })
        .then((res) => res.json())
        .then(async (data) => {
          if (data.ok) {
            await refreshProfile();
          } else {
            setBillingError(data.error ?? "Não foi possível confirmar o pagamento.");
          }
        })
        .catch(() => setBillingError("Falha ao confirmar o pagamento."))
        .finally(() => {
          setSyncing(false);
          setSynced(true);
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assinaturaStatus, sessionId, user]);

  async function handleSubscribe() {
    setBillingLoading(true);
    setBillingError(null);
    try {
      const res = await fetch("/api/checkout", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.url) {
        setBillingError(data.error ?? "Não foi possível iniciar o checkout.");
        setBillingLoading(false);
        return;
      }
      window.location.href = data.url;
    } catch {
      setBillingError("Falha de conexão ao iniciar o checkout.");
      setBillingLoading(false);
    }
  }

  async function handleManageBilling() {
    setBillingLoading(true);
    setBillingError(null);
    try {
      const res = await fetch("/api/portal", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.url) {
        setBillingError(data.error ?? "Não foi possível abrir o portal.");
        setBillingLoading(false);
        return;
      }
      window.location.href = data.url;
    } catch {
      setBillingError("Falha de conexão ao abrir o portal.");
      setBillingLoading(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-chalk/50 text-sm">Carregando...</p>
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

  const roleKey = user.role === "personal" ? "personal" : "cliente";
  const plan = plans[roleKey];

  return (
    <main className="min-h-screen flex flex-col items-center px-6 py-10">
      <div className="w-full max-w-sm mb-8">
        <Link href="/match" className="text-chalk/50 text-sm">
          ← Voltar
        </Link>
      </div>

      <span className="text-teal font-mono text-xs tracking-widest uppercase mb-3">
        Match Fit {roleKey === "personal" ? "Pro" : "Premium"}
      </span>
      <h1 className="font-display text-3xl uppercase tracking-wide text-center mb-2">
        {user.subscriptionActive ? "Sua assinatura" : "Assine pra continuar"}
      </h1>
      <p className="text-chalk/60 text-sm text-center max-w-sm mb-8">
        {roleKey === "personal"
          ? "Apareça pros clientes certos e feche mais sessões."
          : "Encontre o treinador ideal, presencial ou online."}
      </p>

      <div className="w-full max-w-sm bg-ink-light rounded-2xl p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-coral/10 rounded-full blur-2xl" />

        <div className="relative">
          <div className="flex items-baseline gap-1 mb-1">
            <span className="font-display text-4xl">
              {plansLoading ? (
                <span className="inline-block w-20 h-9 bg-chalk/10 rounded animate-pulse align-middle" />
              ) : (
                plan?.price ?? "—"
              )}
            </span>
            {plan?.price && (
              <span className="text-chalk/50 text-sm">/{plan.interval === "month" ? "mês" : plan.interval}</span>
            )}
          </div>
          <p className="text-xs text-chalk/50 mb-6">
            Cancele quando quiser, sem multa
          </p>

          <ul className="space-y-3 mb-8">
            {FEATURES[roleKey].map((feature) => (
              <li key={feature} className="flex items-start gap-2 text-sm text-chalk/80">
                <span className="text-teal mt-0.5">✓</span>
                <span>{feature}</span>
              </li>
            ))}
          </ul>

          {user.subscriptionActive ? (
            <>
              <div className="bg-teal/10 border border-teal/30 rounded-lg px-4 py-2 mb-4 text-center">
                <span className="text-teal text-sm font-medium">
                  ✓ Assinatura ativa
                </span>
              </div>
              <button
                onClick={handleManageBilling}
                disabled={billingLoading}
                className="w-full border border-chalk/20 text-chalk py-3 rounded-full hover:bg-ink transition disabled:opacity-50"
              >
                {billingLoading ? "Abrindo..." : "Gerenciar assinatura"}
              </button>
            </>
          ) : (
            <button
              onClick={handleSubscribe}
              disabled={billingLoading}
              className="w-full bg-coral text-ink font-medium py-3 rounded-full hover:bg-coral-dark transition disabled:opacity-50"
            >
              {billingLoading ? "Abrindo..." : "Assinar agora"}
            </button>
          )}

          {assinaturaStatus === "sucesso" && (
            <p className="text-teal text-xs text-center mt-3">
              {syncing
                ? "Confirmando pagamento com o Stripe..."
                : user.subscriptionActive
                ? "Pagamento confirmado — assinatura ativa!"
                : "Pagamento recebido, mas ainda não confirmamos aqui — tenta recarregar em alguns segundos."}
            </p>
          )}
          {assinaturaStatus === "cancelada" && (
            <p className="text-chalk/50 text-xs text-center mt-3">
              Checkout cancelado.
            </p>
          )}
          {billingError && (
            <p className="text-coral text-xs text-center mt-3">{billingError}</p>
          )}
        </div>
      </div>

      <p className="text-chalk/30 text-xs text-center max-w-sm mt-6">
        Pagamento processado com segurança pelo Stripe. Não guardamos dados
        do seu cartão.
      </p>
    </main>
  );
}
