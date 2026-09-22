-- Migração incremental: substitui o modelo de "match mútuo" (swipe dos
-- dois lados) por um modelo de solicitação direta, estilo Uber — o
-- cliente manda uma solicitação de contato pro treinador, e o treinador
-- aceita ou recusa aquele pedido específico. Só depois de aceito é que o
-- chat e o agendamento abrem.
--
-- A tabela "matches" continua existindo e funcionando exatamente igual
-- (chat, agendamento, /matches) — só muda COMO uma linha nela é criada:
-- antes era um gatilho de swipe mútuo, agora é a aceitação da
-- solicitação.
--
-- Rode isso no SQL Editor do Supabase.

create table contact_requests (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references profiles (id) on delete cascade,
  trainer_id uuid not null references profiles (id) on delete cascade,
  status text not null default 'pending', -- 'pending' | 'accepted' | 'declined'
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  unique (client_id, trainer_id)
);

alter table contact_requests enable row level security;

create policy "Cliente vê as próprias solicitações"
  on contact_requests for select using (auth.uid() = client_id);

create policy "Treinador vê solicitações recebidas"
  on contact_requests for select using (auth.uid() = trainer_id);

-- Cliente só consegue criar solicitação se tiver assinatura ativa —
-- mesma trava que existia antes pro "curtir".
create policy "Cliente cria solicitação com assinatura ativa"
  on contact_requests for insert with check (
    auth.uid() = client_id
    and exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.subscription_active = true
    )
  );

-- Treinador só consegue ACEITAR uma solicitação se também tiver
-- assinatura ativa (pra aceitar e continuar recusar sempre pode).
create policy "Treinador responde solicitações recebidas"
  on contact_requests for update using (auth.uid() = trainer_id)
  with check (
    auth.uid() = trainer_id
    and (
      status <> 'accepted'
      or exists (
        select 1 from profiles p
        where p.id = auth.uid() and p.subscription_active = true
      )
    )
  );

-- Quando uma solicitação é aceita, cria a linha em "matches" sozinho —
-- reaproveitando toda a infraestrutura de chat/agendamento que já existe.
create or replace function create_match_on_request_accepted()
returns trigger as $$
begin
  if new.status = 'accepted' and old.status is distinct from 'accepted' then
    insert into matches (client_id, trainer_id)
    values (new.client_id, new.trainer_id)
    on conflict do nothing;
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_request_accepted
  after update on contact_requests
  for each row execute function create_match_on_request_accepted();

-- A tabela "swipes" e as policies dela ficam sem uso a partir de agora
-- (o código não chama mais isso) — não precisa apagar, mas se quiser
-- limpar depois, é seguro remover.
