-- Migração incremental: modelo "vê de graça, paga pra falar" — navegar e
-- dar match continuam de graça, mas mandar mensagem no chat agora exige
-- assinatura ativa. Isso é reforçado no banco (não só escondendo o campo
-- na interface), então nem manipulando o navegador dá pra burlar.
-- Rode isso no SQL Editor do Supabase.

drop policy if exists "Participantes do match enviam mensagens" on messages;

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
