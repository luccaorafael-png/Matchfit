"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";
import type { UserRole, TrainingMode } from "./data";

export type UserProfile = {
  id: string;
  name: string;
  role: UserRole;
  preferredMode: TrainingMode | "ambos";
  subscriptionActive: boolean;
  avatarUrl: string | null;
  locationLat: number | null;
  locationLng: number | null;
  isAdmin: boolean;
};

type SessionContextType = {
  user: UserProfile | null;
  loading: boolean;
  error: string | null;
  updateUser: (partial: Partial<UserProfile>) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const SessionContext = createContext<SessionContextType | null>(null);

function mapRow(row: any): UserProfile {
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    preferredMode: row.preferred_mode,
    subscriptionActive: row.subscription_active,
    avatarUrl: row.avatar_url ?? null,
    locationLat: row.location_lat ?? null,
    locationLng: row.location_lng ?? null,
    isAdmin: row.is_admin ?? false,
  };
}

export function UserProvider({ children }: { children: ReactNode }) {
  const supabase = createClient();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadProfile(userId: string) {
    try {
      const { data, error: fetchError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (fetchError) {
        console.error("[session] erro ao buscar perfil:", fetchError);
        setError(fetchError.message);
      } else if (!data) {
        // Conta existe no login (auth.users) mas não tem linha em
        // profiles — normalmente sobra de um cadastro antigo que falhou
        // no meio do caminho, ou de um teste em que só a linha de
        // profiles foi apagada manualmente. Encerra a sessão com uma
        // mensagem clara em vez do erro cru do Postgres.
        await supabase.auth.signOut();
        setUser(null);
        setError(
          "Não encontramos um perfil pra essa conta. Se você apagou dados de teste manualmente, o mais simples é apagar essa conta em Authentication > Users no Supabase e se cadastrar de novo."
        );
      } else {
        if (data.banned) {
          // Conta banida — encerra a sessão na hora, não deixa navegar.
          await supabase.auth.signOut();
          setUser(null);
          setError(
            "Sua conta foi suspensa. Se acha que isso é um engano, entre em contato com o suporte."
          );
        } else {
          setUser(mapRow(data));
          setError(null);
        }
      }
    } catch (e: any) {
      // Cai aqui se a chamada nem chegou a responder (URL/chave do Supabase
      // erradas no .env.local, sem internet, projeto pausado, etc.)
      console.error("[session] falha de conexão ao buscar perfil:", e);
      setError(
        "Não foi possível conectar ao Supabase. Confira o .env.local e se o projeto está ativo."
      );
    } finally {
      // Isso SEMPRE roda, então a tela nunca fica travada em "Carregando..."
      setLoading(false);
    }
  }

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (session?.user) {
          loadProfile(session.user.id);
        } else {
          setLoading(false);
        }
      })
      .catch((e) => {
        console.error("[session] falha ao obter sessão:", e);
        setError(
          "Não foi possível conectar ao Supabase. Confira o .env.local e se o projeto está ativo."
        );
        setLoading(false);
      });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session?.user) {
          loadProfile(session.user.id);
          return;
        }

        if (event === "SIGNED_OUT") {
          // Confere de novo antes de aceitar — o Supabase às vezes dispara
          // esse evento por uma corrida na renovação do token (comum com
          // várias abas abertas ou conexões em tempo real simultâneas),
          // sem o usuário ter saído de verdade.
          supabase.auth.getSession().then(({ data: { session: recheck } }) => {
            if (recheck?.user) {
              loadProfile(recheck.user.id);
            } else {
              setUser(null);
              setLoading(false);
            }
          });
          return;
        }

        setUser(null);
        setLoading(false);
      }
    );

    return () => listener.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function updateUser(partial: Partial<UserProfile>) {
    if (!user) return;
    const patch: Record<string, any> = {};
    if (partial.name !== undefined) patch.name = partial.name;
    if (partial.role !== undefined) patch.role = partial.role;
    if (partial.preferredMode !== undefined)
      patch.preferred_mode = partial.preferredMode;
    if (partial.subscriptionActive !== undefined)
      patch.subscription_active = partial.subscriptionActive;
    if (partial.avatarUrl !== undefined) patch.avatar_url = partial.avatarUrl;
    if (partial.locationLat !== undefined)
      patch.location_lat = partial.locationLat;
    if (partial.locationLng !== undefined)
      patch.location_lng = partial.locationLng;

    const { error: updateError } = await supabase
      .from("profiles")
      .update(patch)
      .eq("id", user.id);

    if (updateError) {
      console.error("[session] erro ao atualizar perfil:", updateError);
      setError(updateError.message);
      return;
    }
    setUser({ ...user, ...partial });
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
  }

  async function refreshProfile() {
    if (!user) return;
    await loadProfile(user.id);
  }

  return (
    <SessionContext.Provider
      value={{ user, loading, error, updateUser, signOut, refreshProfile }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error("useSession precisa estar dentro de <UserProvider>");
  }
  return ctx;
}

export type { UserRole, TrainingMode };
