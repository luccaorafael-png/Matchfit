-- Match Fit — Fase 2: schema do banco de dados
-- Rode isso no SQL Editor do seu projeto Supabase (supabase.com/dashboard)

-- 1. Perfil base (um registro por usuário autenticado)
create type user_role as enum ('cliente', 'personal');
create type training_mode as enum ('presencial', 'online', 'ambos');

create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  role user_role not null default 'cliente',
  preferred_mode training_mode not null default 'ambos',
  avatar_url text,
  location_lat double precision,
  location_lng double precision,
  subscription_active boolean not null default false,
  created_at timestamptz not null default now()
);

-- 2. Dados extras de quem é personal trainer
create table trainer_profiles (
  user_id uuid primary key references profiles (id) on delete cascade,
  specialty text not null,
  price_per_session numeric not null,
  bio text,
  cref_number text,
  verified boolean not null default false,
  modes training_mode[] not null default '{presencial}',
  location_lat double precision,
  location_lng double precision
);

-- 3. Dados extras de quem é cliente
create table client_profiles (
  user_id uuid primary key references profiles (id) on delete cascade,
  goal text,
  modes training_mode[] not null default '{presencial}',
  location_lat double precision,
  location_lng double precision
);

-- 4. Swipes (curtidas e passadas) — quem deu like/pass em quem
create table swipes (
  id uuid primary key default gen_random_uuid(),
  from_user uuid not null references profiles (id) on delete cascade,
  to_user uuid not null references profiles (id) on delete cascade,
  liked boolean not null,
  created_at timestamptz not null default now(),
  unique (from_user, to_user)
);

-- 5. Matches (quando os dois lados curtiram)
create table matches (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references profiles (id) on delete cascade,
  trainer_id uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (client_id, trainer_id)
);

-- 6. Assinaturas (Fase 3 usa isso com Stripe, mas a tabela já entra agora)
create table subscriptions (
  user_id uuid primary key references profiles (id) on delete cascade,
  plan text not null,
  status text not null default 'inactive',
  stripe_customer_id text,
  stripe_subscription_id text,
  updated_at timestamptz not null default now()
);

-- Row Level Security: cada usuário só edita o próprio perfil,
-- mas todos os perfis "públicos" (pra matching) podem ser lidos por qualquer
-- usuário autenticado.
alter table profiles enable row level security;
alter table trainer_profiles enable row level security;
alter table client_profiles enable row level security;
alter table swipes enable row level security;
alter table matches enable row level security;
alter table subscriptions enable row level security;

create policy "Perfis são visíveis para usuários autenticados"
  on profiles for select using (auth.role() = 'authenticated');
create policy "Usuário edita o próprio perfil"
  on profiles for update using (auth.uid() = id);
create policy "Usuário cria o próprio perfil"
  on profiles for insert with check (auth.uid() = id);

create policy "Perfis de treinador são visíveis para autenticados"
  on trainer_profiles for select using (auth.role() = 'authenticated');
create policy "Treinador edita o próprio perfil"
  on trainer_profiles for all using (auth.uid() = user_id);

create policy "Perfis de cliente são visíveis para autenticados"
  on client_profiles for select using (auth.role() = 'authenticated');
create policy "Cliente edita o próprio perfil"
  on client_profiles for all using (auth.uid() = user_id);

create policy "Usuário vê os próprios swipes"
  on swipes for select using (auth.uid() = from_user);
create policy "Usuário cria os próprios swipes"
  on swipes for insert with check (
    auth.uid() = from_user
    and exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.subscription_active = true
    )
  );
create policy "Usuário apaga os próprios swipes"
  on swipes for delete using (auth.uid() = from_user);

create policy "Usuário vê os próprios matches"
  on matches for select using (auth.uid() = client_id or auth.uid() = trainer_id);
create policy "Usuário apaga os próprios matches"
  on matches for delete using (auth.uid() = client_id or auth.uid() = trainer_id);

create policy "Usuário vê a própria assinatura"
  on subscriptions for select using (auth.uid() = user_id);
-- Sem policy de insert/update/delete: só o cliente admin (service_role),
-- usado no checkout e no webhook do Stripe, grava nessa tabela.

-- Função + trigger: quando os dois lados dão like um no outro, cria o match
-- automaticamente.
create or replace function create_match_on_mutual_like()
returns trigger as $$
begin
  if new.liked then
    if exists (
      select 1 from swipes
      where from_user = new.to_user
        and to_user = new.from_user
        and liked = true
    ) then
      insert into matches (client_id, trainer_id)
      select
        case when p1.role = 'cliente' then new.from_user else new.to_user end,
        case when p1.role = 'personal' then new.from_user else new.to_user end
      from profiles p1 where p1.id = new.from_user
      on conflict do nothing;
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_swipe_check_match
  after insert on swipes
  for each row execute function create_match_on_mutual_like();

-- 7. Mensagens de chat entre cliente e treinador depois do match
create table messages (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches (id) on delete cascade,
  sender_id uuid not null references profiles (id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

alter table messages enable row level security;

create policy "Participantes do match veem as mensagens"
  on messages for select using (
    exists (
      select 1 from matches m
      where m.id = messages.match_id
        and (m.client_id = auth.uid() or m.trainer_id = auth.uid())
    )
  );

create policy "Participantes do match enviam mensagens"
  on messages for insert with check (
    sender_id = auth.uid()
    and exists (
      select 1 from matches m
      where m.id = messages.match_id
        and (m.client_id = auth.uid() or m.trainer_id = auth.uid())
    )
    and exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.subscription_active = true
    )
  );

-- Habilita o Realtime pra essas tabelas (necessário pro chat e pra tela de
-- matches atualizarem sozinhos, sem precisar recarregar a página)
alter publication supabase_realtime add table messages;
alter publication supabase_realtime add table matches;

-- 8. Storage: bucket pra fotos de perfil
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "Fotos de perfil são públicas"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "Usuário envia a própria foto"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Usuário atualiza a própria foto"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Usuário apaga a própria foto"
  on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Validações de tamanho (defesa em profundidade — o front-end já limita
-- esses campos, isso é reforço contra chamadas diretas à API).
alter table messages
  add constraint messages_content_length check (char_length(content) <= 2000);
alter table profiles
  add constraint profiles_name_length check (char_length(name) <= 100);
alter table trainer_profiles
  add constraint trainer_bio_length check (bio is null or char_length(bio) <= 1000),
  add constraint trainer_specialty_length check (char_length(specialty) <= 100);
alter table client_profiles
  add constraint client_goal_length check (goal is null or char_length(goal) <= 300);

-- 8. Agendamento de sessões dentro do chat (Fase 4)
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

-- Log de auditoria das ações de administração (banir, desativar, apagar).
create table admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references profiles (id) on delete set null,
  admin_name text,
  target_user_id uuid,
  target_name text,
  action text not null,
  created_at timestamptz not null default now()
);

alter table admin_audit_log enable row level security;

create policy "Admins veem o log de auditoria"
  on admin_audit_log for select using (
    exists (
      select 1 from profiles p where p.id = auth.uid() and p.is_admin = true
    )
  );
