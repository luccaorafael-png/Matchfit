"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TrainingMode, Trainer } from "@/lib/data";
import { useSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/client";
import {
  fetchTrainersForClient,
  sendContactRequest,
  resetMyRequests,
  fetchPendingRequestsForTrainer,
  respondToRequest,
  MatchFilters,
  PendingRequest,
} from "@/lib/queries";
import ModeToggle from "@/components/ModeToggle";
import TrainerCard from "@/components/TrainerCard";
import SwipeCard from "@/components/SwipeCard";
import FilterBar from "@/components/FilterBar";
import UserMenu from "@/components/UserMenu";

const defaultFilters: MatchFilters = {
  specialty: "Todas",
  maxPrice: 300,
  maxDistance: 20,
};

export default function Match() {
  const { user, loading: userLoading } = useSession();
  const supabase = createClient();
  const router = useRouter();
  const isTrainerView = user?.role === "personal";

  // --- estado do lado cliente (navegação de treinadores) ---
  const [mode, setMode] = useState<TrainingMode>("presencial");
  const [filters, setFilters] = useState<MatchFilters>(defaultFilters);
  const [list, setList] = useState<Trainer[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [requestMessage, setRequestMessage] = useState("");
  const [resetting, setResetting] = useState(false);

  const canInteract = !!user?.subscriptionActive;

  async function loadTrainers() {
    if (!user) return;
    setLoadingList(true);
    setLoadError(null);
    const viewerLocation =
      user.locationLat != null && user.locationLng != null
        ? { lat: user.locationLat, lng: user.locationLng }
        : null;
    const result = await fetchTrainersForClient(
      supabase,
      user.id,
      mode,
      filters,
      viewerLocation
    );
    setList(result.data);
    setLoadError(result.error);
    setLoadingList(false);
  }

  // --- estado do lado treinador (solicitações recebidas) ---
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [requestsError, setRequestsError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);

  async function loadRequests() {
    if (!user) return;
    setLoadingRequests(true);
    setRequestsError(null);
    const result = await fetchPendingRequestsForTrainer(supabase, user.id);
    setRequests(result.data);
    setRequestsError(result.error);
    setLoadingRequests(false);
  }

  useEffect(() => {
    if (!user) return;
    if (isTrainerView) {
      loadRequests();
    } else {
      loadTrainers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, mode, filters.specialty, filters.maxPrice, filters.maxDistance]);

  const current = list.length > 0 ? list[0] : null;

  function removeCurrent() {
    setList((prev) => prev.slice(1));
  }

  async function handleRequest() {
    if (!current || !user) return;
    const { error } = await sendContactRequest(supabase, user.id, current.id);
    if (error) {
      setRequestMessage(`Não foi possível enviar: ${error}`);
      return;
    }
    setRequestMessage(`Solicitação enviada pra ${current.name}!`);
    setTimeout(() => setRequestMessage(""), 2000);
    removeCurrent();
  }

  function handleSkip() {
    removeCurrent();
  }

  async function handleResetRequests() {
    if (!user) return;
    setResetting(true);
    const { error } = await resetMyRequests(supabase, user.id);
    setResetting(false);
    if (error) {
      setRequestMessage(`Não foi possível limpar: ${error}`);
      return;
    }
    await loadTrainers();
  }

  async function handleRespond(
    requestId: string,
    status: "accepted" | "declined"
  ) {
    setActionId(requestId);
    const { error } = await respondToRequest(supabase, requestId, status);
    setActionId(null);
    if (error) {
      setRequestsError(error);
      return;
    }
    await loadRequests();
  }

  if (userLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-chalk/50 text-sm">Carregando sua sessão...</p>
      </main>
    );
  }

  // ===================== VISÃO DO PERSONAL TRAINER =====================
  if (isTrainerView) {
    return (
      <main className="min-h-screen flex flex-col items-center px-6 py-10">
        <div className="flex items-center justify-between w-full max-w-sm mb-8">
          <Link href="/" className="text-chalk/50 text-sm">
            ← Voltar
          </Link>
          <Link
            href="/matches"
            className="text-chalk/40 text-xs uppercase tracking-wide"
          >
            Meus matches
          </Link>
          <UserMenu />
        </div>

        <h1 className="font-display text-xl uppercase tracking-wide mb-6">
          Solicitações de contato
        </h1>

        {loadingRequests ? (
          <p className="text-chalk/50 text-sm">Carregando...</p>
        ) : requestsError ? (
          <p className="text-coral text-sm text-center max-w-sm">
            {requestsError}
          </p>
        ) : requests.length === 0 ? (
          <p className="text-chalk/50 text-sm text-center max-w-xs">
            Nenhuma solicitação pendente no momento. Quando um cliente pedir
            pra falar com você, aparece aqui.
          </p>
        ) : (
          <div className="w-full max-w-sm space-y-3">
            {requests.map((req) => (
              <div
                key={req.id}
                className="bg-ink-light rounded-xl p-4 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-coral/20 flex items-center justify-center shrink-0">
                    {req.clientAvatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={req.clientAvatarUrl}
                        alt={req.clientName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-coral text-xs font-medium">
                        {req.clientName
                          .split(" ")
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join("")}
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-chalk">{req.clientName}</p>
                    <p className="text-xs text-chalk/50">{req.clientGoal}</p>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => handleRespond(req.id, "accepted")}
                    disabled={actionId === req.id}
                    className="text-xs bg-teal text-ink px-3 py-1 rounded-full hover:bg-teal-dark transition disabled:opacity-50"
                  >
                    Aceitar
                  </button>
                  <button
                    onClick={() => handleRespond(req.id, "declined")}
                    disabled={actionId === req.id}
                    className="text-xs border border-chalk/20 text-chalk/60 px-3 py-1 rounded-full hover:bg-ink transition disabled:opacity-50"
                  >
                    Recusar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    );
  }

  // ===================== VISÃO DO CLIENTE =====================
  return (
    <main className="min-h-screen flex flex-col items-center px-6 py-10">
      <div className="flex items-center justify-between w-full max-w-sm mb-6">
        <Link href="/" className="text-chalk/50 text-sm">
          ← Voltar
        </Link>
        <Link
          href="/matches"
          className="text-chalk/40 text-xs uppercase tracking-wide"
        >
          Meus matches
        </Link>
        <UserMenu />
      </div>

      <ModeToggle mode={mode} onChange={(m) => setMode(m)} />

      <FilterBar
        filters={filters}
        onChange={setFilters}
        showDistance={mode === "presencial"}
      />

      {mode === "presencial" &&
        user &&
        (user.locationLat == null || user.locationLng == null) && (
          <p className="text-chalk/40 text-xs text-center max-w-xs mt-2">
            Você ainda não definiu sua localização — o filtro de distância
            não vai funcionar até você configurar isso em{" "}
            <Link href="/configuracoes" className="text-teal underline">
              Configurações
            </Link>
            .
          </p>
        )}

      <div className="mt-8 w-full min-h-[340px] flex items-center justify-center">
        {loadingList ? (
          <p className="text-chalk/50 text-sm">Buscando perfis...</p>
        ) : loadError ? (
          <p className="text-coral text-sm text-center max-w-xs">
            {loadError}
          </p>
        ) : current ? (
          <SwipeCard
            cardKey={current.id}
            onSwipeLeft={handleSkip}
            onSwipeRight={canInteract ? handleRequest : () => router.push("/planos")}
            rightLabel={canInteract ? "Solicitar" : "Assinar"}
            leftLabel="Próximo"
          >
            <TrainerCard trainer={current} activeMode={mode} />
          </SwipeCard>
        ) : (
          <div className="text-center max-w-xs">
            <p className="font-display text-lg uppercase text-chalk/70 mb-2">
              Acabaram os perfis
            </p>
            <p className="text-sm text-chalk/50 mb-4">
              Você viu todo mundo disponível nesse filtro por agora. Ajuste
              os filtros ou volte mais tarde.
            </p>
            <button
              onClick={handleResetRequests}
              disabled={resetting}
              className="text-xs text-teal border border-teal/40 rounded-full px-4 py-2 hover:bg-teal/10 transition disabled:opacity-50"
            >
              {resetting ? "Limpando..." : "Limpar minhas solicitações (modo teste)"}
            </button>
          </div>
        )}
      </div>

      {current && !loadError && (
        <p className="text-chalk/40 text-xs mt-4">
          Arraste o cartão — direita pra{" "}
          {canInteract ? "solicitar contato" : "assinar"}, esquerda pra ver o
          próximo
        </p>
      )}

      <p className="text-teal text-sm mt-4 h-5">{requestMessage}</p>
    </main>
  );
}
