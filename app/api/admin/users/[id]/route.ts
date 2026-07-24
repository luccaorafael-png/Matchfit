import { NextResponse } from "next/server";
import { requireAdmin } from "../../require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSameOrigin } from "@/lib/security";

async function logAction(
  admin: ReturnType<typeof createAdminClient>,
  adminId: string,
  targetId: string,
  action: string
) {
  const [{ data: adminProfile }, { data: targetProfile }] = await Promise.all([
    admin.from("profiles").select("name").eq("id", adminId).maybeSingle(),
    admin.from("profiles").select("name").eq("id", targetId).maybeSingle(),
  ]);

  await admin.from("admin_audit_log").insert({
    admin_id: adminId,
    admin_name: adminProfile?.name ?? null,
    target_user_id: targetId,
    target_name: targetProfile?.name ?? null,
    action,
  });
}

// PATCH: banir/desbanir ou forçar desativação de assinatura.
// Body: { action: "ban" | "unban" | "deactivateSubscription" }
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Origem não permitida." }, { status: 403 });
  }

  const check = await requireAdmin();
  if (!check.ok) {
    return NextResponse.json({ error: check.error }, { status: check.status });
  }

  const { action } = await request.json();
  const admin = createAdminClient();
  const targetId = params.id;

  if (targetId === check.userId && action === "ban") {
    return NextResponse.json(
      { error: "Você não pode banir a si mesmo." },
      { status: 400 }
    );
  }

  if (action === "verifyCref" || action === "unverifyCref") {
    const { error } = await admin
      .from("trainer_profiles")
      .update({
        verified: action === "verifyCref",
        verified_at: action === "verifyCref" ? new Date().toISOString() : null,
      })
      .eq("user_id", targetId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await logAction(admin, check.userId, targetId, action);
    return NextResponse.json({ ok: true });
  }

  let update: Record<string, any> = {};
  if (action === "ban") update = { banned: true };
  else if (action === "unban") update = { banned: false };
  else if (action === "deactivateSubscription")
    update = { subscription_active: false };
  else return NextResponse.json({ error: "Ação inválida." }, { status: 400 });

  const { error } = await admin
    .from("profiles")
    .update(update)
    .eq("id", targetId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logAction(admin, check.userId, targetId, action);

  return NextResponse.json({ ok: true });
}

// DELETE: apaga a conta por completo (auth.users + cascade em profiles,
// trainer/client_profiles, swipes, matches, mensagens e assinatura).
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Origem não permitida." }, { status: 403 });
  }

  const check = await requireAdmin();
  if (!check.ok) {
    return NextResponse.json({ error: check.error }, { status: check.status });
  }

  const targetId = params.id;
  if (targetId === check.userId) {
    return NextResponse.json(
      { error: "Você não pode apagar a própria conta de admin por aqui." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  // Registra ANTES de apagar (senão perdemos o nome do alvo, já que o
  // registro tem "on delete set null" no target_user_id).
  await logAction(admin, check.userId, targetId, "delete");

  const { error } = await admin.auth.admin.deleteUser(targetId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
