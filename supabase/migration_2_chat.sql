-- Migração incremental: rode isso no SQL Editor do Supabase.
-- (Só precisa disso, não precisa rodar o schema.sql inteiro de novo.)

create table messages (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches (id) on delete cascade,
  sender_id uuid not null references profiles (id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

alter table messages enable row level security;

create policy "Participantes do match veem as mensagens"
  on messages for select
  using (
    exists (
      select 1 from matches m
      where m.id = messages.match_id
        and (m.client_id = auth.uid() or m.trainer_id = auth.uid())
    )
  );

create policy "Participantes do match podem enviar mensagens"
  on messages for insert
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from matches m
      where m.id = messages.match_id
        and (m.client_id = auth.uid() or m.trainer_id = auth.uid())
    )
  );

-- Habilita Realtime (atualização ao vivo) nas tabelas que a UI escuta.
alter publication supabase_realtime add table messages;
alter publication supabase_realtime add table matches;
