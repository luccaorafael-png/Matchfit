"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TrainingMode, Trainer, Client } from "@/lib/data";
import { useSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/client";
import {
  fetchTrainersForClient,
  fetchClientsForTrainer,
  registerSwipe,
  resetMySwipes,
  MatchFilters,
} from "@/lib/queries";
import ModeToggle from "@/components/ModeToggle";
import TrainerCard from "@/components/TrainerCard";
import ClientCard from "@/components/ClientCard";
import SwipeCard from "@/components/SwipeCard";
import FilterBar, { Filters } from "@/components/FilterBar";
import UserMenu from "@/components/UserMenu";

const defaultFilters: Filters = {
  specialty: "Todas",
  maxPrice: 500,
  maxDistance: 20,
};

export default function Match() {
  const { user, loading: userLoading } = useSession();
  const supabase = createClient();
  const router = useRouter();
  const isTrainerView = user?.role === "personal";

  const [mode, setMode] = useState<TrainingMode>("presencial");
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [list, setList] = useState<(Trainer | Client)[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [matchMessage, setMatchMessage] = useState("");
  const [newMatchId, setNewMatchId] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const [browseIndex, setBrowseIndex] = useState(0);

  const canInteract = !!user?.subscriptionActive;

  async function handleResetSwipes() {
    if (!user) return;
    setResetting(true);
    const { error } = await resetMySwipes(supabase, user.id);
    setResetting(false);
    if (error) {
      setMatchMessage(`Não foi possível limpar: ${error}`);
      return;
    }
    await loadList();
  }

  useEffect(() => {
    if (!user) return;
    loadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, mode, filters.specialty, filters.maxPrice, filters.maxDistance]);

  async function loadList() {
    if (!user) return;
    setLoadingList(true);
    setLoadError(null);
    const asFilters: MatchFilters = { ...filters };
    const viewerLocation =
      user.locationLat != null && user.locationLng != null
        ? { lat: user.locationLat, lng: user.locationLng }
        : null;
    const result = isTrainerView
      ? await fetchClientsForTrainer(
          supabase,
          user.id,
          mode,
          viewerLocation,
          filters.maxDistance
        )
      : await fetchTrainersForClient(
          supabase,
          user.id,
          mode,
          asFilters,
          viewerLocation
        );
    setList(result.data);
    setLoadError(result.error);
    setLoadingList(false);
  }

  const current = canInteract
    ? list.length > 0
      ? list[0]
      : null
    : list.length > 0
    ? list[browseIndex % list.length]
    : null;

  function browseNext() {
    setBrowseIndex((i) => i + 1);
  }

  function removeCurrentFromList() {
    setList((prev) => prev.slice(1));
  }

  function handleMode(newMode: TrainingMode) {
    setMode(newMode);
    setMatchMessage("");
    setNewMatchId(null);
  }

  function handleFilters(newFilters: Filters) {
    setFilters(newFilters);
    setMatchMessage("");
    setNewMatchId(null);
  }

  async function pass() {
    if (!current || !user) return;
    setNewMatchId(null);
    removeCurrentFromList();
    const { error } = await registerSwipe(supabase, user.id, current.id, false);
    if (error) setMatchMessage("Não foi possível registrar — tente de novo.");
  }

  async function like() {
    if (!current || !user) return;
    const likedName = current.name;
    setMatchMessage(`Você curtiu ${likedName} — aguardando resposta...`);
    setNewMatchId(null);
    removeCurrentFromList();
    const { matchId, error } = await registerSwipe(
      supabase,
      user.id,
      current.id,
      true
    );
    if (error) {
      setMatchMessage("Não foi possível registrar o like — tente de novo.");
      return;
    }
    if (matchId) {
      setMatchMessage(`É um match com ${likedName}! 🎉`);
      setNewMatchId(matchId);
    } else {
      setMatchMessage(`Você curtiu ${likedName}.`);
      setTimeout(() => setMatchMessage(""), 2500);
    }
  }

  if (userLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-chalk/50 text-sm">Carregando sua sessão...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center px-6 py-10">
      <div className="flex items-center justify-between w-full max-w-sm mb-6">
        <Link href="/" className="text-chalk/50 text-sm">
          ← Voltar
        </Link>
        <Link href="/matches" className="text-chalk/40 text-xs uppercase tracking-wide">
          Meus matches
        </Link>
        <UserMenu />
      </div>

      <ModeToggle mode={mode} onChange={handleMode} />
      <p className="text-chalk/40 text-xs uppercase tracking-wide mt-2">
        {isTrainerView ? "Vendo clientes" : "Vendo treinadores"}
      </p>

      {!isTrainerView && (
        <FilterBar
          filters={filters}
          onChange={handleFilters}
          showDistance={mode === "presencial"}
        />
      )}

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
          <div className="text-center max-w-xs">
            <p className="font-display text-lg uppercase text-coral mb-2">
              Deu erro na busca
            </p>
            <p className="text-sm text-chalk/50 mb-4 break-words">{loadError}</p>
            <button
              onClick={loadList}
              className="text-xs text-teal border border-teal/40 rounded-full px-4 py-2 hover:bg-teal/10 transition"
            >
              Tentar de novo
            </button>
          </div>
        ) : current ? (
          <SwipeCard
            cardKey={current.id}
            onSwipeLeft={canInteract ? pass : browseNext}
            onSwipeRight={canInteract ? like : () => router.push("/planos")}
            rightLabel={canInteract ? "Curtir" : "Assinar"}
            leftLabel={canInteract ? "Passar" : "Próximo"}
          >
            {isTrainerView ? (
              <ClientCard client={current as Client} activeMode={mode} />
            ) : (
              <TrainerCard trainer={current as Trainer} activeMode={mode} />
            )}
          </SwipeCard>
        ) : (
          <div className="text-center max-w-xs">
            <p className="font-display text-lg uppercase text-chalk/70 mb-2">
              Acabaram os perfis
            </p>
            <p className="text-sm text-chalk/50 mb-4">
              Você viu todo mundo disponível nesse filtro por agora. Ajuste os
              filtros ou volte mais tarde.
            </p>
            <button
              onClick={handleResetSwipes}
              disabled={resetting}
              className="text-xs text-teal border border-teal/40 rounded-full px-4 py-2 hover:bg-teal/10 transition disabled:opacity-50"
            >
              {resetting ? "Limpando..." : "Limpar swipes e matches (modo teste)"}
            </button>
          </div>
        )}
      </div>

      {current && !loadError && (
        <p className="text-chalk/40 text-xs mt-4">
          {canInteract
            ? "Arraste o cartão — direita para curtir, esquerda para passar"
            : "Arraste o cartão — direita pra assinar, esquerda pra ver o próximo"}
        </p>
      )}

      <p className="text-teal text-sm mt-4 h-5">{matchMessage}</p>
      {newMatchId && (
        <Link
          href={`/chat/${newMatchId}`}
          className="text-xs text-ink bg-teal px-4 py-2 rounded-full mt-2 hover:bg-teal-dark transition"
        >
          Ir para o chat →
        </Link>
      )}
    </main>
  );
}
