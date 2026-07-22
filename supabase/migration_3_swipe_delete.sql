-- Migração incremental: permite que o usuário apague os próprios swipes
-- (necessário pro botão "limpar meus swipes" na tela de match, útil em
-- teste quando os perfis somem porque você já passou por todo mundo).
-- Rode isso no SQL Editor do Supabase.

create policy "Usuário apaga os próprios swipes"
  on swipes for delete using (auth.uid() = from_user);
