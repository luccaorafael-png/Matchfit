-- Migração incremental: adiciona as colunas de localização na tabela
-- profiles (a client_profiles já tinha, mas eu esqueci de adicionar aqui
-- também — sem isso, "Usar minha localização" em Configurações dá erro:
-- "Could not find the 'location_lat' column of 'profiles'").
-- Rode isso no SQL Editor do Supabase.

alter table profiles add column if not exists location_lat double precision;
alter table profiles add column if not exists location_lng double precision;
