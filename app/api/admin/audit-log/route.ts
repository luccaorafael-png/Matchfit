import { NextResponse } from "next/server";
import { requireAdmin } from "../require-admin";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const check = await requireAdmin();
    if (!check.ok) {
      return NextResponse.json({ error: check.error }, { status: check.status });
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("admin_audit_log")
      .select("id, admin_name, target_name, action, created_at")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ logs: data });
  } catch (err: any) {
    console.error("[/api/admin/audit-log] erro inesperado:", err);
    return NextResponse.json(
      {
        error: `Erro inesperado: ${err?.message ?? "confira as variáveis de ambiente na Vercel."}`,
      },
      { status: 500 }
    );
  }
}
