import type { CapacitorConfig } from "@capacitor/cli";

// IMPORTANTE: esse app usa rotas de servidor do Next.js (login, checkout,
// webhooks, middleware de autenticação) — por isso não dá pra "exportar"
// ele como arquivos estáticos dentro do Capacitor, como se faz com um site
// simples. Em vez disso, o app Android é uma casca fina que abre o site
// publicado de verdade (igual o app do Twitter/X ou do Instagram Lite
// fazem, por exemplo). Você PRECISA publicar o site (ex: na Vercel) antes
// de gerar o app — veja o passo a passo no README, seção "Capacitor".
//
// Troque a URL abaixo pela URL real do seu site publicado.
const PRODUCTION_URL = process.env.CAPACITOR_SERVER_URL ?? "https://SEU-SITE-PUBLICADO.vercel.app";

const config: CapacitorConfig = {
  appId: "com.matchfit.app",
  appName: "Match Fit",
  webDir: "public/capacitor-placeholder",
  server: {
    url: PRODUCTION_URL,
    cleartext: false,
  },
};

export default config;
