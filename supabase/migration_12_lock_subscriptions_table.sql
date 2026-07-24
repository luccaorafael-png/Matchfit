-- Migração incremental: a tabela subscriptions deixa de ser gravável
-- direto pelo usuário (mesmo os próprios dados) — só o servidor (via
-- service_role, no checkout e no webhook do Stripe) grava aqui a partir
-- de agora. Isso fecha uma brecha onde alguém poderia, pelo DevTools,
-- reescrever o próprio status de assinatura nessa tabela (mesmo sem
-- efeito prático, já que o acesso real depende de profiles.subscription_active,
-- que já era protegido — isso é reforço extra).
-- Rode isso no SQL Editor do Supabase.

drop policy if exists "Usuário edita a própria assinatura" on subscriptions;
