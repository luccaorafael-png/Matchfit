import { NextResponse } from "next/server";
import { requireAdmin } from "../require-admin";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
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
}
