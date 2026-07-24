-- Migração incremental: agora nem "curtir" nem "passar" funcionam sem
-- assinatura ativa — só navegar/olhar os perfis continua de graça.
-- Rode isso no SQL Editor do Supabase.

drop policy if exists "Usuário cria os próprios swipes" on swipes;

create policy "Usuário cria os próprios swipes"
  on swipes for insert with check (
    auth.uid() = from_user
    and exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.subscription_active = true
    )
  );
