/** @type {import('next').NextConfig} */
const nextConfig = {
  // Esconde o header "X-Powered-By: Next.js" — não ajuda em nada quem usa
  // o app, só facilita a vida de quem quer atacar (revela a stack).
  poweredByHeader: false,

  async headers() {
    const isDev = process.env.NODE_ENV !== "production";

    // Em desenvolvimento, o Next.js usa eval() e um WebSocket pro Fast
    // Refresh (hot reload) funcionar — sem isso, o JavaScript inteiro da
    // página quebra silenciosamente. Em produção isso não é necessário,
    // então mantemos o CSP restrito só lá.
    const scriptSrc = isDev
      ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
      : "script-src 'self' 'unsafe-inline'";
    const connectSrc = isDev
      ? "connect-src 'self' ws: https://*.supabase.co wss://*.supabase.co https://nominatim.openstreetmap.org https://api.stripe.com"
      : "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://nominatim.openstreetmap.org https://api.stripe.com";

    return [
      {
        source: "/:path*",
        headers: [
          // Impede que o site seja carregado dentro de um <iframe> de
          // outro domínio (proteção contra clickjacking).
          { key: "X-Frame-Options", value: "DENY" },
          // Impede o navegador de tentar "adivinhar" o tipo de um arquivo
          // diferente do que o servidor declarou.
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Não vaza a URL completa de onde veio o clique pra sites de fora.
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Desliga acesso a câmera/microfone/geolocalização de terceiros
          // embutidos na página (o app pede geolocalização direto, isso
          // não afeta essa permissão pedida pelo próprio site).
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(self)",
          },
          // Força HTTPS por 2 anos depois da primeira visita (só tem
          // efeito em produção, atrás de HTTPS de verdade).
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          // Restringe de onde o navegador pode carregar script, imagem,
          // fonte e conexão — reduz bastante o estrago possível de um
          // ataque de XSS, mesmo que um dia role algum. 'unsafe-inline'
          // em script-src é uma concessão prática do Next.js (App Router
          // injeta alguns scripts inline pra hidratação); o ideal a longo
          // prazo é migrar pra CSP com nonce, mas isso já cobre bastante.
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              scriptSrc,
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https://*.supabase.co",
              connectSrc,
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
