import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSameOrigin } from "@/lib/security";

// Confirma uma sessão de Checkout direto com o Stripe e já ativa a
// assinatura na hora — serve de segunda camada além do webhook, útil
// principalmente em desenvolvimento local (onde o webhook só chega se o
// `stripe listen` estiver rodando). Em produção, o webhook normalmente já
// resolve isso um pouco antes até da pessoa voltar pro site.
export async function POST(request: Request) {
  try {
    if (!isSameOrigin(request)) {
      return NextResponse.json({ error: "Origem não permitida." }, { status: 403 });
    }

    const { sessionId } = await request.json();
    if (!sessionId) {
      return NextResponse.json(
        { error: "sessionId não informado." },
        { status: 400 }
      );
    }

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription"],
    });

    // Confere se essa sessão de checkout é realmente do usuário logado —
    // sem isso, alguém poderia tentar confirmar a sessão de outra pessoa.
    if (session.metadata?.supabase_user_id !== user.id) {
      return NextResponse.json(
        { error: "Essa sessão não pertence a esse usuário." },
        { status: 403 }
      );
    }

    if (session.payment_status !== "paid") {
      return NextResponse.json(
        { error: "Pagamento ainda não confirmado pelo Stripe." },
        { status: 400 }
      );
    }

    const subscriptionId =
      typeof session.subscription === "string"
        ? session.subscription
        : session.subscription?.id;
    const customerId =
      typeof session.customer === "string"
        ? session.customer
        : session.customer?.id;

    // Só a partir daqui usamos o cliente admin — a escrita é validada pelo
    // que o Stripe confirmou acima, não pelo que o navegador pediu.
    // Usamos upsert (não update) porque, se por algum motivo a linha
    // inicial de "pending" não tiver sido criada no /api/checkout, um
    // simples update não afetaria nenhuma linha e o stripe_customer_id
    // nunca seria preenchido — quebrando o botão "Gerenciar assinatura"
    // depois, mesmo com o pagamento confirmado.
    const admin = createAdminClient();

    const { error: subError } = await admin.from("subscriptions").upsert({
      user_id: user.id,
      plan: session.metadata?.plan ?? "cliente",
      status: "active",
      stripe_customer_id: customerId ?? null,
      stripe_subscription_id: subscriptionId ?? null,
      updated_at: new Date().toISOString(),
    });

    if (subError) {
      console.error("[/api/checkout/sync] erro ao atualizar subscriptions:", subError);
      return NextResponse.json({ error: subError.message }, { status: 500 });
    }

    const { error: profileError } = await admin
      .from("profiles")
      .update({ subscription_active: true })
      .eq("id", user.id);

    if (profileError) {
      console.error("[/api/checkout/sync] erro ao atualizar profiles:", profileError);
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[/api/checkout/sync] erro:", err);
    return NextResponse.json(
      { error: err?.message ?? "Erro ao confirmar o pagamento." },
      { status: 500 }
    );
  }
}
