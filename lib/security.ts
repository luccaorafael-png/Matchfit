// Devolve a URL do site pra usar em redirects (checkout, portal, etc).
// Prioriza NEXT_PUBLIC_SITE_URL (configurada manualmente), mas cai pra URL
// automática da Vercel se não estiver configurada, e por último localhost
// pra desenvolvimento.
export function getSiteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

// Confere se a requisição veio do próprio site, não de um formulário
// escondido em outro domínio tentando abusar do cookie de sessão da
// pessoa (CSRF). Os cookies de sessão do Supabase já usam SameSite=Lax
// (o navegador já bloqueia isso na maioria dos casos), mas essa é uma
// segunda camada barata pras rotas que mexem com dinheiro ou conta.
//
// Compara o Origin da requisição com o Host dela mesma — ou seja,
// "isso está sendo enviado pro mesmo domínio de onde saiu?". Isso é mais
// confiável do que tentar adivinhar a URL "certa" via variável de
// ambiente (VERCEL_URL, por exemplo, reflete o deploy específico com um
// hash único, não o domínio "bonito" que a pessoa realmente usa).
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");

  // Sem header Origin (comum em chamadas server-to-server, tipo o
  // webhook do Stripe) — essas rotas se autenticam de outro jeito
  // (assinatura do webhook), então isso não se aplica a elas.
  if (!origin) return true;

  const host = request.headers.get("host");
  if (!host) return true; // não deveria acontecer, mas não bloqueia à toa

  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
