import { createClient } from "@/lib/supabase/server";

// Confere se quem está fazendo a requisição está logado E é admin.
// Usa o cliente normal (com RLS) — cada um só pode ler o próprio perfil,
// então isso é seguro mesmo sem service_role aqui.
export async function requireAdmin() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false as const, status: 401, error: "Não autenticado." };
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (error || !profile?.is_admin) {
    return { ok: false as const, status: 403, error: "Acesso restrito a administradores." };
  }

  return { ok: true as const, userId: user.id };
}
