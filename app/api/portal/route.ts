import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { isSameOrigin } from "@/lib/security";

// Cria uma sessão do Portal de Cobrança do Stripe, onde o usuário pode ver
// faturas, trocar cartão ou cancelar a assinatura — sem a gente precisar
// construir essa tela.
export async function POST(request: Request) {
  try {
    if (!isSameOrigin(request)) {
      return NextResponse.json({ error: "Origem não permitida." }, { status: 403 });
    }

    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const { data: sub, error } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error || !sub?.stripe_customer_id) {
      return NextResponse.json(
        { error: "Você ainda não tem uma assinatura para gerenciar." },
        { status: 400 }
      );
    }

    const stripe = getStripe();
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

    const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      return_url: `${siteUrl}/planos`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error("[/api/portal] erro:", err);
    return NextResponse.json(
      { error: err?.message ?? "Erro inesperado ao abrir o portal." },
      { status: 500 }
    );
  }
}
