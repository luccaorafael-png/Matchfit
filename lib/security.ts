// Confere se a requisição veio do próprio site, não de um formulário
// escondido em outro domínio tentando abusar do cookie de sessão da
// pessoa (CSRF). Os cookies de sessão do Supabase já usam SameSite=Lax
// (o navegador já bloqueia isso na maioria dos casos), mas essa é uma
// segunda camada barata pras rotas que mexem com dinheiro ou conta.
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  // Sem header Origin (comum em chamadas server-to-server, tipo o
  // webhook do Stripe) — essas rotas se autenticam de outro jeito
  // (assinatura do webhook), então isso não se aplica a elas.
  if (!origin) return true;

  if (!siteUrl) return true; // sem NEXT_PUBLIC_SITE_URL configurada, não dá pra comparar

  try {
    return new URL(origin).host === new URL(siteUrl).host;
  } catch {
    return false;
  }
}
