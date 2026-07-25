import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Cliente "admin" do Supabase — usa a service role key, que ignora RLS.
// SÓ pode ser usado em código de servidor que nunca roda no navegador
// (como o webhook do Stripe), porque essa chave dá acesso total ao banco.
export function createAdminClient() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configuradas — confira as variáveis de ambiente na Vercel (Settings > Environment Variables) e faça um redeploy."
    );
  }
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );
}
