"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/session";
import { TrainingMode } from "@/lib/data";
import AvatarUploader from "@/components/AvatarUploader";

export default function Configuracoes() {
  const { user, updateUser, signOut, loading, error } = useSession();
  const router = useRouter();
  const [locLoading, setLocLoading] = useState(false);
  const [locError, setLocError] = useState<string | null>(null);
  const [locLabel, setLocLabel] = useState<string | null>(null);

  useEffect(() => {
    if (user?.locationLat == null || user?.locationLng == null) {
      setLocLabel(null);
      return;
    }
    // Geocodificação reversa (coordenadas -> endereço legível), usando o
    // Nominatim do OpenStreetMap, que é gratuito e não exige chave de API.
    fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${user.locationLat}&lon=${user.locationLng}`,
      { headers: { Accept: "application/json" } }
    )
      .then((res) => res.json())
      .then((data) => {
        const addr = data.address ?? {};
        const cidade =
          addr.city ?? addr.town ?? addr.village ?? addr.suburb ?? "";
        const estado = addr.state ?? "";
        setLocLabel(
          [cidade, estado].filter(Boolean).join(", ") || "Localização definida"
        );
      })
      .catch(() => setLocLabel("Localização definida"));
  }, [user?.locationLat, user?.locationLng]);

  async function handleUseLocation() {
    setLocError(null);
    if (!navigator.geolocation) {
      setLocError("Seu navegador não suporta geolocalização.");
      return;
    }
    setLocLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        await updateUser({
          locationLat: pos.coords.latitude,
          locationLng: pos.coords.longitude,
        });
        setLocLoading(false);
      },
      (err) => {
        setLocError(
          err.code === err.PERMISSION_DENIED
            ? "Permissão de localização negada."
            : "Não foi possível obter sua localização."
        );
        setLocLoading(false);
      }
    );
  }

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

  function handleModeChange(mode: TrainingMode | "ambos") {
    updateUser({ preferredMode: mode });
  }

  async function handleLogout() {
    await signOut();
    router.push("/");
  }

  return (
    <main className="min-h-screen flex flex-col items-center px-6 py-10">
      <div className="w-full max-w-sm mb-6">
        <Link href="/perfil" className="text-chalk/50 text-sm">
          ← Voltar ao perfil
        </Link>
      </div>

      <div className="bg-ink-light rounded-2xl p-6 w-full max-w-sm">
        <h1 className="font-display text-xl uppercase tracking-wide mb-6">
          Configurações
        </h1>

        <div className="mb-6">
          <AvatarUploader />
        </div>

        <div className="mb-6">
          <label className="block text-xs text-chalk/60 mb-2">
            Modalidade de treino preferida
          </label>
          <div className="flex gap-2">
            {(["presencial", "online", "ambos"] as const).map((m) => (
              <button
                key={m}
                onClick={() => handleModeChange(m)}
                className={`flex-1 py-2 rounded-lg border text-xs capitalize ${
                  user.preferredMode === m
                    ? "border-teal text-teal"
                    : "border-chalk/20 text-chalk/60"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-xs text-chalk/60 mb-2">
            Localização (usada pra distância no modo presencial)
          </label>
          <div className="flex items-center justify-between text-sm">
            <span className="text-chalk/70">
              {user.locationLat != null
                ? locLabel ?? "Definida"
                : "Ainda não definida"}
            </span>
            <button
              onClick={handleUseLocation}
              disabled={locLoading}
              className="text-xs text-teal border border-teal/40 rounded-full px-3 py-1 hover:bg-teal/10 transition disabled:opacity-50"
            >
              {locLoading ? "Obtendo..." : "Usar minha localização"}
            </button>
          </div>
          {locError && <p className="text-coral text-xs mt-1">{locError}</p>}
        </div>

        <div className="mb-6">
          <label className="block text-xs text-chalk/60 mb-2">
            Assinatura
          </label>
          <div className="flex items-center justify-between text-sm">
            <span
              className={user.subscriptionActive ? "text-teal" : "text-chalk/70"}
            >
              {user.subscriptionActive ? "Ativa" : "Inativa"}
            </span>
            <Link
              href="/planos"
              className="text-xs text-coral border border-coral/40 rounded-full px-3 py-1 hover:bg-coral/10 transition"
            >
              Ver planos
            </Link>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full border border-chalk/20 text-chalk/70 py-3 rounded-full hover:bg-ink transition text-sm"
        >
          Sair da conta
        </button>
      </div>
    </main>
  );
}
