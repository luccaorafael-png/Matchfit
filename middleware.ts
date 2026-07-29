import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_ROUTES = [
  "/match",
  "/perfil",
  "/configuracoes",
  "/matches",
  "/chat",
  "/admin",
  "/planos",
];

export async function middleware(request: NextRequest) {
  // Gera um código aleatório novo a cada requisição ("nonce"). Só
  // scripts marcados com esse código exato (os que o próprio Next.js
  // injeta) têm permissão de rodar — isso fecha a brecha do
  // 'unsafe-inline' que a auditoria de segurança apontou, sem quebrar a
  // hidratação do Next.js.
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");

  const cspHeader = `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' 'strict-dynamic';
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    font-src 'self' https://fonts.gstatic.com;
    img-src 'self' data: blob: https://*.supabase.co;
    connect-src 'self' https://*.supabase.co wss://*.supabase.co https://nominatim.openstreetmap.org https://api.stripe.com;
    frame-ancestors 'none';
    base-uri 'self';
    form-action 'self';
  `
    .replace(/\s{2,}/g, " ")
    .trim();

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", cspHeader);

  let response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isProtected = PROTECTED_ROUTES.some((route) =>
    request.nextUrl.pathname.startsWith(route)
  );

  if (isProtected && !user) {
    const redirectUrl = new URL("/login", request.url);
    return NextResponse.redirect(redirectUrl);
  }

  response.headers.set("Content-Security-Policy", cspHeader);
  return response;
}

// Antes, isso só rodava nas rotas protegidas — agora precisa rodar em
// TODAS as páginas (menos os arquivos estáticos), porque o CSP com nonce
// precisa ser aplicado no site inteiro, não só onde tem checagem de
// login.
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
