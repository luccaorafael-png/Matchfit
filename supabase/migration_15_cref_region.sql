-- Migração incremental: complementa os campos de CREF que já existiam
-- no schema (cref_number, verified) com a região (necessária pra saber
-- em qual site regional do CREF conferir) e a data da verificação.
-- Rode isso no SQL Editor do Supabase.

alter table trainer_profiles add column if not exists cref_region text;
alter table trainer_profiles add column if not exists verified_at timestamptz;
