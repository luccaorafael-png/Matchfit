-- Migração incremental: validações de tamanho direto no banco. O
-- front-end já limita esses campos, mas isso é reforço contra alguém
-- chamando a API do Supabase direto (via DevTools, por exemplo).
-- Rode isso no SQL Editor do Supabase.

alter table messages
  add constraint messages_content_length check (char_length(content) <= 2000);

alter table profiles
  add constraint profiles_name_length check (char_length(name) <= 100);

alter table trainer_profiles
  add constraint trainer_bio_length check (bio is null or char_length(bio) <= 1000),
  add constraint trainer_specialty_length check (char_length(specialty) <= 100);

alter table client_profiles
  add constraint client_goal_length check (goal is null or char_length(goal) <= 300);
