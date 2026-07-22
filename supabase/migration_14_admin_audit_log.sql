-- Migração incremental: log de auditoria das ações de administração.
-- Toda vez que um admin banir, desbanir, desativar assinatura ou apagar
-- uma conta, fica registrado quem fez, em quem, e quando — importante pra
-- rastrear uso indevido (inclusive por outro admin) e pra você ter
-- histórico se um usuário reclamar de uma ação.
-- Rode isso no SQL Editor do Supabase.

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

-- Só admins conseguem ler o log — e mesmo eles não conseguem escrever
-- nele diretamente (só o servidor grava, via service_role, garantindo que
-- o registro é sempre fiel ao que realmente aconteceu).
create policy "Admins veem o log de auditoria"
  on admin_audit_log for select using (
    exists (
      select 1 from profiles p where p.id = auth.uid() and p.is_admin = true
    )
  );
