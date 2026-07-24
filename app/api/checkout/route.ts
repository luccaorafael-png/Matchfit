import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSameOrigin, getSiteUrl } from "@/lib/security";

// Cria uma sessão de Checkout do Stripe pro plano certo (cliente ou
// personal trainer) e devolve a URL pra onde o navegador deve redirecionar.
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

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "Perfil não encontrado." },
        { status: 400 }
      );
    }

    const priceId =
      profile.role === "personal"
        ? process.env.STRIPE_PRICE_TRAINER
        : process.env.STRIPE_PRICE_CLIENT;

    if (!priceId) {
      return NextResponse.json(
        {
          error:
            "Faltou configurar STRIPE_PRICE_CLIENT / STRIPE_PRICE_TRAINER no .env.local.",
        },
        { status: 500 }
      );
    }

    const stripe = getStripe();

    // Reaproveita o customer do Stripe se essa pessoa já tiver um salvo.
    const { data: existingSub } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    let customerId = existingSub?.stripe_customer_id ?? undefined;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;
    }

    const siteUrl = getSiteUrl();

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${siteUrl}/planos?assinatura=sucesso&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/planos?assinatura=cancelada`,
      metadata: { supabase_user_id: user.id, plan: profile.role === "personal" ? "personal" : "cliente" },
      subscription_data: {
        metadata: { supabase_user_id: user.id },
      },
    });

    // Guarda o customer_id já de cara (o webhook confirma o resto quando o
    // pagamento acontecer de verdade). Usa o cliente admin porque a tabela
    // subscriptions não é mais gravável direto pelo usuário — só o
    // servidor (aqui e no webhook) pode escrever nela.
    const admin = createAdminClient();
    await admin.from("subscriptions").upsert({
      user_id: user.id,
      plan: profile.role === "personal" ? "personal" : "cliente",
      status: "pending",
      stripe_customer_id: customerId,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error("[/api/checkout] erro:", err);
    return NextResponse.json(
      { error: err?.message ?? "Erro inesperado ao iniciar o checkout." },
      { status: 500 }
    );
  }
}
