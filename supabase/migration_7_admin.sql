-- Migração incremental: adiciona controle de administração.
-- Rode isso no SQL Editor do Supabase.

alter table profiles add column if not exists is_admin boolean not null default false;
alter table profiles add column if not exists banned boolean not null default false;

-- Só quem já é admin pode tornar outra pessoa admin ou banir alguém — mas
-- isso é reforçado no código das rotas /api/admin/*, que usam a
-- service_role key só depois de confirmar que quem está pedindo já é
-- admin. Por segurança extra, ninguém consegue mudar essas duas colunas
-- direto pelo navegador (nem o próprio dono da conta):
revoke update (is_admin, banned) on profiles from authenticated;

-- IMPORTANTE: depois de rodar isso, torne a SUA conta admin manualmente
-- (troque o e-mail abaixo pelo seu e rode só essa linha):
--
-- update profiles set is_admin = true
-- where id = (select id from auth.users where email = 'seu-email@exemplo.com');
