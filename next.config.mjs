/** @type {import('next').NextConfig} */
const nextConfig = {
  // Esconde o header "X-Powered-By: Next.js" — não ajuda em nada quem usa
  // o app, só facilita a vida de quem quer atacar (revela a stack).
  poweredByHeader: false,

  async headers() {
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
          // Novo: impede que outra janela/aba controlada por outro site
          // consiga referenciar essa página via window.opener.
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          // Novo: só permite que recursos dessa página (imagens, etc)
          // sejam carregados por requisições do mesmo site.
          { key: "Cross-Origin-Resource-Policy", value: "same-origin" },

          // O Content-Security-Policy NÃO fica mais aqui — ele precisa
          // de um código novo (nonce) a cada requisição, o que só dá pra
          // gerar no middleware.ts, não aqui (esses headers são fixos).
        ],
      },
    ];
  },
};

export default nextConfig;
