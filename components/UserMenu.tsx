"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSession } from "@/lib/session";

export default function UserMenu() {
  const { user } = useSession();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!user) return null;

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full hover:bg-ink-light transition"
      >
        <span className="w-8 h-8 rounded-full bg-coral/20 border border-coral/40 flex items-center justify-center text-xs font-medium text-coral overflow-hidden">
          {user.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.avatarUrl}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            initials || "?"
          )}
        </span>
        <span className="text-sm text-chalk/80">{user.name}</span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-44 bg-ink-light border border-chalk/10 rounded-xl shadow-lg overflow-hidden z-20">
          <Link
            href="/perfil"
            onClick={() => setOpen(false)}
            className="block px-4 py-3 text-sm text-chalk hover:bg-ink transition"
          >
            Perfil
          </Link>
          <Link
            href="/planos"
            onClick={() => setOpen(false)}
            className="block px-4 py-3 text-sm text-coral hover:bg-ink transition border-t border-chalk/10"
          >
            {user.subscriptionActive ? "Assinatura" : "Assinar"}
          </Link>
          <Link
            href="/configuracoes"
            onClick={() => setOpen(false)}
            className="block px-4 py-3 text-sm text-chalk hover:bg-ink transition border-t border-chalk/10"
          >
            Configurações
          </Link>
          {user.isAdmin && (
            <Link
              href="/admin"
              onClick={() => setOpen(false)}
              className="block px-4 py-3 text-sm text-teal hover:bg-ink transition border-t border-chalk/10"
            >
              Administração
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
