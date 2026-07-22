import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import Stripe from "stripe";

// O Stripe chama essa rota diretamente (não é o navegador do usuário), por
// isso ela usa o cliente admin — não existe sessão de usuário aqui.
export async function POST(request: Request) {
  const body = await request.text();
  const signature = headers().get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Sem assinatura." }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error("[stripe webhook] assinatura inválida:", err.message);
    return NextResponse.json(
      { error: `Webhook inválido: ${err.message}` },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.supabase_user_id;
      if (userId && session.subscription) {
        await supabase
          .from("subscriptions")
          .update({
            status: "active",
            stripe_subscription_id: session.subscription as string,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId);

        await supabase
          .from("profiles")
          .update({ subscription_active: true })
          .eq("id", userId);
      }
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = subscription.metadata?.supabase_user_id;
      const isActive = subscription.status === "active";
      if (userId) {
        await supabase
          .from("subscriptions")
          .update({
            status: subscription.status,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId);

        await supabase
          .from("profiles")
          .update({ subscription_active: isActive })
          .eq("id", userId);
      }
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = subscription.metadata?.supabase_user_id;
      if (userId) {
        await supabase
          .from("subscriptions")
          .update({ status: "canceled", updated_at: new Date().toISOString() })
          .eq("user_id", userId);

        await supabase
          .from("profiles")
          .update({ subscription_active: false })
          .eq("id", userId);
      }
      break;
    }

    default:
      // Outros eventos a gente ignora por enquanto.
      break;
  }

  return NextResponse.json({ received: true });
}
