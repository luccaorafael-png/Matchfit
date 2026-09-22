"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";
import { TrainingMode, UserRole } from "./data";

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

  async function tryCompleteSignup(userId: string): Promise<boolean> {
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    const meta = authUser?.user_metadata as Record<string, any> | undefined;

    if (!meta?.name || !meta?.role) return false;

    const { error: createError } = await supabase.from("profiles").insert({
      id: userId,
      name: meta.name,
      role: meta.role,
      preferred_mode: meta.preferred_mode ?? "ambos",
    });

    if (createError) {
      console.error("[session] erro ao completar cadastro:", createError);
      return false;
    }

    const modesArray: TrainingMode[] =
      meta.preferred_mode === "ambos"
        ? ["presencial", "online"]
        : [meta.preferred_mode ?? "presencial"];

    if (meta.role === "personal") {
      await supabase.from("trainer_profiles").insert({
        user_id: userId,
        specialty: meta.specialty ?? "",
        price_per_session: meta.price_per_session ?? 0,
        cref_number: meta.cref_number ?? null,
        cref_region: meta.cref_region ?? null,
        modes: modesArray,
      });
    } else {
      await supabase.from("client_profiles").insert({
        user_id: userId,
        goal: meta.goal ?? "",
        modes: modesArray,
      });
    }

    return true;
  }

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
        return;
      }

      if (!data) {
        const completed = await tryCompleteSignup(userId);

        if (completed) {
          const { data: freshData, error: refetchError } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", userId)
            .maybeSingle();

          if (!refetchError && freshData) {
            setUser(mapRow(freshData));
            setError(null);
            return;
          }
        }

        await supabase.auth.signOut();
        setUser(null);
        setError(
          "Não encontramos um perfil pra essa conta. Se você apagou dados de teste manualmente, o mais simples é apagar essa conta em Authentication > Users no Supabase e se cadastrar de novo."
        );
        return;
      }

      if (data.banned) {
        await supabase.auth.signOut();
        setUser(null);
        setError(
          "Sua conta foi suspensa. Se acha que isso é um engano, entre em contato com o suporte."
        );
      } else {
        setUser(mapRow(data));
        setError(null);
      }
    } catch (err: any) {
      console.error("[session] erro inesperado:", err);
      setError(err?.message ?? "Erro inesperado ao carregar sessão.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        loadProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session?.user) {
          loadProfile(session.user.id);
          return;
        }

        if (event === "SIGNED_OUT") {
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

    return () => {
      listener.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function updateUser(partial: Partial<UserProfile>) {
    if (!user) return;
    const patch: Record<string, any> = {};
    if (partial.name !== undefined) patch.name = partial.name;
    if (partial.preferredMode !== undefined)
      patch.preferred_mode = partial.preferredMode;
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
