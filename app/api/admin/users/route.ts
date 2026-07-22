import { NextResponse } from "next/server";
import { requireAdmin } from "../require-admin";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const check = await requireAdmin();
  if (!check.ok) {
    return NextResponse.json({ error: check.error }, { status: check.status });
  }

  const admin = createAdminClient();

  const { data: profiles, error: profilesError } = await admin
    .from("profiles")
    .select(
      "id, name, role, subscription_active, is_admin, banned, created_at"
    )
    .order("created_at", { ascending: false });

  if (profilesError) {
    return NextResponse.json({ error: profilesError.message }, { status: 500 });
  }

  // O e-mail só existe em auth.users, não em profiles — busca à parte com
  // a service_role key (a única forma de acessar essa tabela).
  const { data: authUsers, error: authError } =
    await admin.auth.admin.listUsers({ perPage: 1000 });

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 500 });
  }

  const emailById = new Map(authUsers.users.map((u) => [u.id, u.email]));

  const users = (profiles ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    email: emailById.get(p.id) ?? "—",
    role: p.role,
    subscriptionActive: p.subscription_active,
    isAdmin: p.is_admin,
    banned: p.banned,
    createdAt: p.created_at,
  }));

  return NextResponse.json({ users });
}
