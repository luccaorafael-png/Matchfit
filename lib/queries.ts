import { SupabaseClient } from "@supabase/supabase-js";
import { Trainer, Client, TrainingMode } from "./data";
import { haversineKm } from "./geo";

export type MatchFilters = {
  specialty: string;
  maxPrice: number;
  maxDistance: number;
};

export type Result<T> = {
  data: T;
  error: string | null;
};

export type ViewerLocation = { lat: number; lng: number } | null;

// Busca treinadores (visão do cliente) — exclui quem já recebeu
// solicitação (pendente, aceita ou recusada), filtra por
// modalidade/especialidade/preço/distância real.
export async function fetchTrainersForClient(
  supabase: SupabaseClient,
  currentUserId: string,
  mode: TrainingMode,
  filters: MatchFilters,
  viewerLocation: ViewerLocation
): Promise<Result<Trainer[]>> {
  const { data: seen, error: seenError } = await supabase
    .from("contact_requests")
    .select("trainer_id")
    .eq("client_id", currentUserId);

  if (seenError) {
    console.error("[fetchTrainersForClient] erro ao buscar solicitações:", seenError);
    return { data: [], error: seenError.message };
  }
  const seenIds = (seen ?? []).map((s: any) => s.trainer_id);

  let query = supabase
    .from("trainer_profiles")
    .select(
      "user_id, specialty, price_per_session, bio, modes, verified, profiles!inner(name, avatar_url, location_lat, location_lng)"
    )
    .contains("modes", [mode])
    .lte("price_per_session", filters.maxPrice);

  if (filters.specialty !== "Todas") {
    query = query.eq("specialty", filters.specialty);
  }
  if (seenIds.length > 0) {
    query = query.not("user_id", "in", `(${seenIds.join(",")})`);
  }

  const { data, error } = await query;
  if (error) {
    console.error("[fetchTrainersForClient] erro na busca:", error);
    return { data: [], error: error.message };
  }

  let trainers: Trainer[] = (data ?? []).map((row: any) => {
    const tLat = row.profiles?.location_lat;
    const tLng = row.profiles?.location_lng;
    const distanceKm =
      mode === "presencial" && viewerLocation && tLat != null && tLng != null
        ? haversineKm(viewerLocation.lat, viewerLocation.lng, tLat, tLng)
        : undefined;

    return {
      id: row.user_id,
      name: row.profiles?.name ?? "Treinador",
      specialty: row.specialty,
      pricePerSession: row.price_per_session,
      rating: 5,
      modes: row.modes,
      bio: row.bio ?? "",
      avatarUrl: row.profiles?.avatar_url ?? null,
      crefVerified: row.verified ?? false,
      distanceKm,
    };
  });

  if (mode === "presencial" && viewerLocation) {
    trainers = trainers.filter(
      (t) => t.distanceKm === undefined || t.distanceKm <= filters.maxDistance
    );
  }

  return { data: trainers, error: null };
}

// Envia uma solicitação de contato do cliente pro treinador (equivalente
// ao antigo "curtir", mas sem precisar de reciprocidade — o treinador que
// decide aceitar ou recusar).
export async function sendContactRequest(
  supabase: SupabaseClient,
  clientId: string,
  trainerId: string
): Promise<{ error: string | null }> {
  const { error } = await supabase.from("contact_requests").insert({
    client_id: clientId,
    trainer_id: trainerId,
    status: "pending",
  });

  if (error) {
    console.error("[sendContactRequest] erro:", error);
    return { error: error.message };
  }
  return { error: null };
}

export type PendingRequest = {
  id: string;
  clientId: string;
  clientName: string;
  clientAvatarUrl: string | null;
  clientGoal: string;
  createdAt: string;
};

// Busca as solicitações pendentes recebidas por um treinador.
export async function fetchPendingRequestsForTrainer(
  supabase: SupabaseClient,
  trainerId: string
): Promise<Result<PendingRequest[]>> {
  const { data, error } = await supabase
    .from("contact_requests")
    .select(
      "id, client_id, created_at, profiles!contact_requests_client_id_fkey(name, avatar_url), client_profiles!inner(goal)"
    )
    .eq("trainer_id", trainerId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[fetchPendingRequestsForTrainer] erro:", error);
    return { data: [], error: error.message };
  }

  const requests: PendingRequest[] = (data ?? []).map((row: any) => ({
    id: row.id,
    clientId: row.client_id,
    clientName: row.profiles?.name ?? "Cliente",
    clientAvatarUrl: row.profiles?.avatar_url ?? null,
    clientGoal: row.client_profiles?.goal ?? "",
    createdAt: row.created_at,
  }));

  return { data: requests, error: null };
}

// Treinador aceita ou recusa uma solicitação. Ao aceitar, o banco cria o
// match sozinho (trigger create_match_on_request_accepted).
export async function respondToRequest(
  supabase: SupabaseClient,
  requestId: string,
  status: "accepted" | "declined"
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("contact_requests")
    .update({ status, responded_at: new Date().toISOString() })
    .eq("id", requestId);

  if (error) {
    console.error("[respondToRequest] erro:", error);
    return { error: error.message };
  }
  return { error: null };
}

// Limpa as solicitações que o cliente já enviou — útil em teste, quando
// os perfis somem porque você já mandou solicitação pra todo mundo
// disponível.
export async function resetMyRequests(
  supabase: SupabaseClient,
  clientId: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("contact_requests")
    .delete()
    .eq("client_id", clientId);

  if (error) {
    console.error("[resetMyRequests] erro:", error);
    return { error: error.message };
  }
  return { error: null };
}

export type MatchSummary = {
  matchId: string;
  otherUserId: string;
  otherUserName: string;
};

// Lista os matches (conexões aceitas) do usuário atual, com o nome da
// outra pessoa já resolvido.
export async function fetchMatchesForUser(
  supabase: SupabaseClient,
  currentUserId: string
): Promise<Result<MatchSummary[]>> {
  const { data, error } = await supabase
    .from("matches")
    .select(
      "id, client_id, trainer_id, client:profiles!matches_client_id_fkey(name), trainer:profiles!matches_trainer_id_fkey(name)"
    )
    .or(`client_id.eq.${currentUserId},trainer_id.eq.${currentUserId}`)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[fetchMatchesForUser] erro:", error);
    return { data: [], error: error.message };
  }

  const matches = (data ?? []).map((row: any) => {
    const isClient = row.client_id === currentUserId;
    return {
      matchId: row.id,
      otherUserId: isClient ? row.trainer_id : row.client_id,
      otherUserName: isClient
        ? row.trainer?.name ?? "Treinador"
        : row.client?.name ?? "Cliente",
    };
  });

  return { data: matches, error: null };
}

export type ChatMessage = {
  id: string;
  matchId: string;
  senderId: string;
  content: string;
  createdAt: string;
};

export async function fetchMessages(
  supabase: SupabaseClient,
  matchId: string
): Promise<Result<ChatMessage[]>> {
  const { data, error } = await supabase
    .from("messages")
    .select("id, match_id, sender_id, content, created_at")
    .eq("match_id", matchId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[fetchMessages] erro:", error);
    return { data: [], error: error.message };
  }

  const messages = (data ?? []).map((row: any) => ({
    id: row.id,
    matchId: row.match_id,
    senderId: row.sender_id,
    content: row.content,
    createdAt: row.created_at,
  }));

  return { data: messages, error: null };
}

export async function sendMessage(
  supabase: SupabaseClient,
  matchId: string,
  senderId: string,
  content: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("messages")
    .insert({ match_id: matchId, sender_id: senderId, content });

  if (error) {
    console.error("[sendMessage] erro ao enviar:", error);
    return { error: error.message };
  }
  return { error: null };
}

export type SessionProposal = {
  id: string;
  matchId: string;
  proposedBy: string;
  scheduledAt: string;
  status: "pending" | "confirmed" | "declined" | "cancelled";
};

export async function fetchSessionsForMatch(
  supabase: SupabaseClient,
  matchId: string
): Promise<Result<SessionProposal[]>> {
  const { data, error } = await supabase
    .from("sessions")
    .select("id, match_id, proposed_by, scheduled_at, status")
    .eq("match_id", matchId)
    .order("scheduled_at", { ascending: true });

  if (error) {
    console.error("[fetchSessionsForMatch] erro:", error);
    return { data: [], error: error.message };
  }

  const sessions = (data ?? []).map((row: any) => ({
    id: row.id,
    matchId: row.match_id,
    proposedBy: row.proposed_by,
    scheduledAt: row.scheduled_at,
    status: row.status,
  }));

  return { data: sessions, error: null };
}

export async function proposeSession(
  supabase: SupabaseClient,
  matchId: string,
  proposedBy: string,
  scheduledAtISO: string
): Promise<{ error: string | null }> {
  const { error } = await supabase.from("sessions").insert({
    match_id: matchId,
    proposed_by: proposedBy,
    scheduled_at: scheduledAtISO,
    status: "pending",
  });

  if (error) {
    console.error("[proposeSession] erro:", error);
    return { error: error.message };
  }
  return { error: null };
}

export async function respondToSession(
  supabase: SupabaseClient,
  sessionId: string,
  status: "confirmed" | "declined" | "cancelled"
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("sessions")
    .update({ status })
    .eq("id", sessionId);

  if (error) {
    console.error("[respondToSession] erro:", error);
    return { error: error.message };
  }
  return { error: null };
}
