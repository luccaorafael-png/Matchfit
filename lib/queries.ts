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

// Busca treinadores (visão do cliente), excluindo quem o usuário já deu
// swipe, filtrando por modalidade/especialidade/preço/distância real.
export async function fetchTrainersForClient(
  supabase: SupabaseClient,
  currentUserId: string,
  mode: TrainingMode,
  filters: MatchFilters,
  viewerLocation: ViewerLocation
): Promise<Result<Trainer[]>> {
  const { data: seen, error: seenError } = await supabase
    .from("swipes")
    .select("to_user")
    .eq("from_user", currentUserId);

  if (seenError) {
    console.error("[fetchTrainersForClient] erro ao buscar swipes:", seenError);
    return { data: [], error: seenError.message };
  }
  const seenIds = (seen ?? []).map((s: any) => s.to_user);

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

  // Só filtra por distância se o próprio usuário já tiver definido a
  // localização — sem isso, não dá pra saber o quão longe alguém está,
  // então mostramos todo mundo em vez de esconder por engano.
  if (mode === "presencial" && viewerLocation) {
    trainers = trainers.filter(
      (t) => t.distanceKm === undefined || t.distanceKm <= filters.maxDistance
    );
  }

  return { data: trainers, error: null };
}

// Busca clientes (visão do personal trainer), mesma lógica de exclusão.
export async function fetchClientsForTrainer(
  supabase: SupabaseClient,
  currentUserId: string,
  mode: TrainingMode,
  viewerLocation: ViewerLocation,
  maxDistance: number
): Promise<Result<Client[]>> {
  const { data: seen, error: seenError } = await supabase
    .from("swipes")
    .select("to_user")
    .eq("from_user", currentUserId);

  if (seenError) {
    console.error("[fetchClientsForTrainer] erro ao buscar swipes:", seenError);
    return { data: [], error: seenError.message };
  }
  const seenIds = (seen ?? []).map((s: any) => s.to_user);

  let query = supabase
    .from("client_profiles")
    .select(
      "user_id, goal, modes, profiles!inner(name, avatar_url, location_lat, location_lng)"
    )
    .contains("modes", [mode]);

  if (seenIds.length > 0) {
    query = query.not("user_id", "in", `(${seenIds.join(",")})`);
  }

  const { data, error } = await query;
  if (error) {
    console.error("[fetchClientsForTrainer] erro na busca:", error);
    return { data: [], error: error.message };
  }

  let clients: Client[] = (data ?? []).map((row: any) => {
    const cLat = row.profiles?.location_lat;
    const cLng = row.profiles?.location_lng;
    const distanceKm =
      mode === "presencial" && viewerLocation && cLat != null && cLng != null
        ? haversineKm(viewerLocation.lat, viewerLocation.lng, cLat, cLng)
        : undefined;

    return {
      id: row.user_id,
      name: row.profiles?.name ?? "Cliente",
      goal: row.goal ?? "",
      modes: row.modes,
      bio: row.goal ?? "",
      avatarUrl: row.profiles?.avatar_url ?? null,
      distanceKm,
    };
  });

  if (mode === "presencial" && viewerLocation) {
    clients = clients.filter(
      (c) => c.distanceKm === undefined || c.distanceKm <= maxDistance
    );
  }

  return { data: clients, error: null };
}

// Registra o swipe e retorna o id do match se virou match mútuo. Em vez de
// só checar se JÁ existe uma linha em "matches" (o que pode pegar um match
// antigo de um teste anterior), confirmamos a mutualidade direto nos swipes
// atuais — só assim garantimos que o match é realmente fresco.
export async function registerSwipe(
  supabase: SupabaseClient,
  fromUser: string,
  toUser: string,
  liked: boolean
): Promise<{ matchId: string | null; error: string | null }> {
  const { error: swipeError } = await supabase
    .from("swipes")
    .upsert(
      { from_user: fromUser, to_user: toUser, liked },
      { onConflict: "from_user,to_user" }
    );

  if (swipeError) {
    console.error("[registerSwipe] erro ao gravar swipe:", swipeError);
    return { matchId: null, error: swipeError.message };
  }

  if (!liked) return { matchId: null, error: null };

  // Confere se virou match checando a tabela "matches" — que o trigger do
  // banco já cria sozinho quando os dois lados curtem. Não dá pra checar
  // isso lendo o swipe da OUTRA pessoa direto (from_user = toUser), porque
  // a política de segurança só deixa cada um ler os próprios swipes — essa
  // consulta sempre voltaria vazia mesmo quando o match é real.
  const { data, error } = await supabase
    .from("matches")
    .select("id")
    .or(
      `and(client_id.eq.${fromUser},trainer_id.eq.${toUser}),and(client_id.eq.${toUser},trainer_id.eq.${fromUser})`
    )
    .limit(1);

  if (error) {
    console.error("[registerSwipe] erro ao conferir match:", error);
    return { matchId: null, error: error.message };
  }

  return { matchId: data && data.length > 0 ? data[0].id : null, error: null };
}

export type MatchSummary = {
  matchId: string;
  otherUserId: string;
  otherUserName: string;
  createdAt: string;
};

// Lista todos os matches do usuário logado, dos dois lados (seja ele
// cliente ou personal trainer), com o nome de quem está do outro lado.
export async function fetchMatchesForUser(
  supabase: SupabaseClient,
  userId: string
): Promise<Result<MatchSummary[]>> {
  const { data, error } = await supabase
    .from("matches")
    .select(
      "id, created_at, client_id, trainer_id, client:client_id(name), trainer:trainer_id(name)"
    )
    .or(`client_id.eq.${userId},trainer_id.eq.${userId}`)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[fetchMatchesForUser] erro na busca:", error);
    return { data: [], error: error.message };
  }

  const matches: MatchSummary[] = (data ?? []).map((row: any) => {
    const isClient = row.client_id === userId;
    return {
      matchId: row.id,
      otherUserId: isClient ? row.trainer_id : row.client_id,
      otherUserName:
        (isClient ? row.trainer?.name : row.client?.name) ?? "Usuário",
      createdAt: row.created_at,
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
    console.error("[fetchMessages] erro na busca:", error);
    return { data: [], error: error.message };
  }

  const messages: ChatMessage[] = (data ?? []).map((row: any) => ({
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

// Apaga todos os swipes (likes e passes) E matches que o usuário tem —
// útil em teste, quando um match antigo "reaparece" numa curtida nova
// porque o registro de match anterior nunca foi removido.
export async function resetMySwipes(
  supabase: SupabaseClient,
  userId: string
): Promise<{ error: string | null }> {
  const { error: swipesError } = await supabase
    .from("swipes")
    .delete()
    .eq("from_user", userId);

  if (swipesError) {
    console.error("[resetMySwipes] erro ao limpar swipes:", swipesError);
    return { error: swipesError.message };
  }

  const { error: matchesError } = await supabase
    .from("matches")
    .delete()
    .or(`client_id.eq.${userId},trainer_id.eq.${userId}`);

  if (matchesError) {
    console.error("[resetMySwipes] erro ao limpar matches:", matchesError);
    return { error: matchesError.message };
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

export async function fetchSessions(
  supabase: SupabaseClient,
  matchId: string
): Promise<Result<SessionProposal[]>> {
  const { data, error } = await supabase
    .from("sessions")
    .select("id, match_id, proposed_by, scheduled_at, status")
    .eq("match_id", matchId)
    .order("scheduled_at", { ascending: true });

  if (error) {
    console.error("[fetchSessions] erro:", error);
    return { data: [], error: error.message };
  }

  return {
    data: (data ?? []).map((row: any) => ({
      id: row.id,
      matchId: row.match_id,
      proposedBy: row.proposed_by,
      scheduledAt: row.scheduled_at,
      status: row.status,
    })),
    error: null,
  };
}

export async function proposeSession(
  supabase: SupabaseClient,
  matchId: string,
  proposedBy: string,
  scheduledAt: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("sessions")
    .insert({ match_id: matchId, proposed_by: proposedBy, scheduled_at: scheduledAt });

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
