"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "@/lib/session";

type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  subscriptionActive: boolean;
  isAdmin: boolean;
  banned: boolean;
  createdAt: string;
};

type AuditLogEntry = {
  id: string;
  adminName: string | null;
  targetName: string | null;
  action: string;
  createdAt: string;
};

const ACTION_LABELS: Record<string, string> = {
  ban: "baniu",
  unban: "desbaniu",
  deactivateSubscription: "desativou a assinatura de",
  delete: "apagou a conta de",
};

export default function AdminPage() {
  const { user, loading } = useSession();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);

  useEffect(() => {
    if (user?.isAdmin) {
      loadUsers();
      loadAuditLog();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function loadAuditLog() {
    try {
      const res = await fetch("/api/admin/audit-log");
      const data = await res.json();
      if (res.ok) {
        setLogs(
          (data.logs ?? []).map((l: any) => ({
            id: l.id,
            adminName: l.admin_name,
            targetName: l.target_name,
            action: l.action,
            createdAt: l.created_at,
          }))
        );
      }
    } catch {
      // silencioso — o log é só informativo, não trava a página de admin
    }
  }

  async function loadUsers() {
    setListLoading(true);
    setListError(null);
    try {
      const res = await fetch("/api/admin/users");
      const data = await res.json();
      if (!res.ok) {
        setListError(data.error ?? "Erro ao carregar usuários.");
      } else {
        setUsers(data.users);
      }
    } catch {
      setListError("Falha de conexão ao carregar usuários.");
    }
    setListLoading(false);
  }

  async function handleAction(id: string, action: string) {
    setActionId(id);
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) {
        setListError(data.error ?? "Erro ao executar ação.");
      } else {
        await loadUsers();
        await loadAuditLog();
      }
    } catch {
      setListError("Falha de conexão ao executar ação.");
    }
    setActionId(null);
  }

  async function handleDelete(id: string, name: string) {
    if (
      !confirm(
        `Apagar a conta de "${name}" permanentemente? Isso não pode ser desfeito.`
      )
    )
      return;

    setActionId(id);
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setListError(data.error ?? "Erro ao apagar conta.");
      } else {
        await loadUsers();
        await loadAuditLog();
      }
    } catch {
      setListError("Falha de conexão ao apagar conta.");
    }
    setActionId(null);
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-chalk/50 text-sm">Carregando...</p>
      </main>
    );
  }

  if (!user?.isAdmin) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6">
        <p className="text-coral text-sm text-center">
          Acesso restrito a administradores.
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-6 py-10">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Link href="/match" className="text-chalk/50 text-sm">
            ← Voltar ao app
          </Link>
          <h1 className="font-display text-xl uppercase tracking-wide">
            Administração
          </h1>
          <span />
        </div>

        {listError && (
          <p className="text-coral text-sm mb-4 text-center">{listError}</p>
        )}

        {listLoading ? (
          <p className="text-chalk/50 text-sm text-center">Carregando usuários...</p>
        ) : (
          <div className="space-y-3">
            {users.map((u) => (
              <div
                key={u.id}
                className="bg-ink-light rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
              >
                <div>
                  <p className="font-medium text-chalk">
                    {u.name}{" "}
                    {u.isAdmin && (
                      <span className="text-xs text-teal ml-1">(admin)</span>
                    )}
                    {u.banned && (
                      <span className="text-xs text-coral ml-1">(banido)</span>
                    )}
                  </p>
                  <p className="text-xs text-chalk/50">{u.email}</p>
                  <p className="text-xs text-chalk/50 capitalize">
                    {u.role} ·{" "}
                    {u.subscriptionActive ? "assinatura ativa" : "sem assinatura"}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {!u.isAdmin && (
                    <button
                      onClick={() =>
                        handleAction(u.id, u.banned ? "unban" : "ban")
                      }
                      disabled={actionId === u.id}
                      className="text-xs border border-chalk/20 text-chalk/70 rounded-full px-3 py-1 hover:bg-ink transition disabled:opacity-50"
                    >
                      {u.banned ? "Desbanir" : "Banir"}
                    </button>
                  )}
                  {u.subscriptionActive && (
                    <button
                      onClick={() =>
                        handleAction(u.id, "deactivateSubscription")
                      }
                      disabled={actionId === u.id}
                      className="text-xs border border-chalk/20 text-chalk/70 rounded-full px-3 py-1 hover:bg-ink transition disabled:opacity-50"
                    >
                      Desativar assinatura
                    </button>
                  )}
                  {!u.isAdmin && (
                    <button
                      onClick={() => handleDelete(u.id, u.name)}
                      disabled={actionId === u.id}
                      className="text-xs border border-coral/40 text-coral rounded-full px-3 py-1 hover:bg-coral/10 transition disabled:opacity-50"
                    >
                      Apagar conta
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {logs.length > 0 && (
          <div className="mt-10">
            <h2 className="font-display text-sm uppercase tracking-wide text-chalk/60 mb-3">
              Log de auditoria (últimas 50 ações)
            </h2>
            <div className="space-y-1">
              {logs.map((log) => (
                <p key={log.id} className="text-xs text-chalk/50">
                  <span className="text-chalk/70">{log.adminName ?? "admin"}</span>{" "}
                  {ACTION_LABELS[log.action] ?? log.action}{" "}
                  <span className="text-chalk/70">{log.targetName ?? "conta apagada"}</span>{" "}
                  · {new Date(log.createdAt).toLocaleString("pt-BR")}
                </p>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
