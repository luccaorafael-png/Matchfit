-- Migração incremental: permite apagar seus próprios matches (necessário
-- pro botão "limpar swipes e matches de teste" não deixar matches antigos
-- pra trás, o que causava match "falso" em curtidas futuras).
-- Rode isso no SQL Editor do Supabase.

create policy "Usuário apaga os próprios matches"
  on matches for delete using (auth.uid() = client_id or auth.uid() = trainer_id);
