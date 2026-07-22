-- Migração incremental: agendamento de sessões dentro do chat (Fase 4).
-- Rode isso no SQL Editor do Supabase.

create table sessions (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches (id) on delete cascade,
  proposed_by uuid not null references profiles (id) on delete cascade,
  scheduled_at timestamptz not null,
  status text not null default 'pending', -- pending | confirmed | declined | cancelled
  created_at timestamptz not null default now()
);

alter table sessions enable row level security;

create policy "Participantes do match veem as sessões"
  on sessions for select using (
    exists (
      select 1 from matches m
      where m.id = sessions.match_id
        and (m.client_id = auth.uid() or m.trainer_id = auth.uid())
    )
  );

create policy "Participantes assinantes propõem sessão"
  on sessions for insert with check (
    proposed_by = auth.uid()
    and exists (
      select 1 from matches m
      where m.id = sessions.match_id
        and (m.client_id = auth.uid() or m.trainer_id = auth.uid())
    )
    and exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.subscription_active = true
    )
  );

create policy "Participantes respondem a sessão"
  on sessions for update using (
    exists (
      select 1 from matches m
      where m.id = sessions.match_id
        and (m.client_id = auth.uid() or m.trainer_id = auth.uid())
    )
  );

alter publication supabase_realtime add table sessions;
