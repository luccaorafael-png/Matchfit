import Stripe from "stripe";

// Instância única do Stripe, só usada em código de servidor (API routes) —
// nunca importe isso em componentes de cliente, a chave secreta não pode
// vazar pro navegador.
//
// A inicialização é preguiçosa (só cria o client na primeira chamada) pra
// não derrubar a rota inteira com um erro de import caso STRIPE_SECRET_KEY
// ainda não esteja configurada — nesse caso, getStripe() lança um erro
// comum, que a rota consegue capturar num try/catch e mostrar direito.
let stripeInstance: Stripe | null = null;

export function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error(
      "STRIPE_SECRET_KEY não configurada — preencha o .env.local (veja .env.local.example) e reinicie o servidor."
    );
  }
  if (!stripeInstance) {
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2024-06-20",
    });
  }
  return stripeInstance;
}
