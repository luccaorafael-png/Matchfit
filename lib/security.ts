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
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");

  // Sem header Origin (comum em chamadas server-to-server, tipo o
  // webhook do Stripe) — essas rotas se autenticam de outro jeito
  // (assinatura do webhook), então isso não se aplica a elas.
  if (!origin) return true;

  const allowedHosts = new Set<string>();

  if (process.env.NEXT_PUBLIC_SITE_URL) {
    try {
      allowedHosts.add(new URL(process.env.NEXT_PUBLIC_SITE_URL).host);
    } catch {
      // valor inválido em NEXT_PUBLIC_SITE_URL — ignora e segue com o resto
    }
  }

  // A Vercel preenche isso sozinha em cada deploy (produção ou preview),
  // então isso funciona mesmo se NEXT_PUBLIC_SITE_URL não tiver sido
  // atualizada ainda pra URL certa.
  if (process.env.VERCEL_URL) {
    allowedHosts.add(process.env.VERCEL_URL);
  }

  // Nenhuma das duas configuradas (ex: rodando local sem nada definido) —
  // não dá pra comparar, então não bloqueia.
  if (allowedHosts.size === 0) return true;

  try {
    return allowedHosts.has(new URL(origin).host);
  } catch {
    return false;
  }
}
