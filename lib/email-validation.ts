// Lista de provedores de e-mail "reais" aceitos no cadastro — bloqueia
// e-mails descartáveis/temporários e domínios inventados. Ajuste essa
// lista livremente se quiser aceitar mais provedores (ex: e-mail
// corporativo de algum parceiro específico).
export const ALLOWED_EMAIL_DOMAINS = [
  "gmail.com",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "msn.com",
  "yahoo.com",
  "yahoo.com.br",
  "icloud.com",
  "me.com",
  "uol.com.br",
  "bol.com.br",
  "terra.com.br",
  "globo.com",
  "protonmail.com",
  "proton.me",
];

export function isAllowedEmailDomain(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase().trim();
  if (!domain) return false;
  return ALLOWED_EMAIL_DOMAINS.includes(domain);
}
