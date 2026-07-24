-- Migração incremental: cria o bucket de Storage pra fotos de perfil e as
-- policies de acesso. Rode isso no SQL Editor do Supabase.

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Qualquer pessoa pode VER as fotos (bucket público, precisa pra elas
-- aparecerem nos cartões de match).
create policy "Fotos de perfil são públicas"
  on storage.objects for select
  using (bucket_id = 'avatars');

-- Só o dono pode enviar/atualizar/apagar a própria foto. O arquivo precisa
-- ser salvo dentro de uma "pasta" com o próprio user id, ex:
-- avatars/<user_id>/foto.jpg — é assim que a policy confere o dono.
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
