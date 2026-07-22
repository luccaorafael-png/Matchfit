import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";

function formatPrice(amount: number | null, currency: string) {
  if (amount == null) return null;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}

// Busca os preços reais configurados no Stripe, pra tela de planos nunca
// ficar desatualizada em relação ao que é cobrado de verdade.
export async function GET() {
  try {
    const stripe = getStripe();
    const [clientPrice, trainerPrice] = await Promise.all([
      process.env.STRIPE_PRICE_CLIENT
        ? stripe.prices.retrieve(process.env.STRIPE_PRICE_CLIENT)
        : null,
      process.env.STRIPE_PRICE_TRAINER
        ? stripe.prices.retrieve(process.env.STRIPE_PRICE_TRAINER)
        : null,
    ]);

    return NextResponse.json({
      cliente: clientPrice
        ? {
            price: formatPrice(clientPrice.unit_amount, clientPrice.currency),
            interval: clientPrice.recurring?.interval ?? "mês",
          }
        : null,
      personal: trainerPrice
        ? {
            price: formatPrice(trainerPrice.unit_amount, trainerPrice.currency),
            interval: trainerPrice.recurring?.interval ?? "mês",
          }
        : null,
    });
  } catch (err: any) {
    console.error("[/api/plans] erro:", err);
    // Não trava a tela — só mostra sem o preço se o Stripe ainda não
    // estiver configurado.
    return NextResponse.json({ cliente: null, personal: null });
  }
}
