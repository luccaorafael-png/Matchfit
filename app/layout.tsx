import type { Metadata } from "next";
import "./globals.css";
import { UserProvider } from "@/lib/session";

export const metadata: Metadata = {
  title: "Match Fit — Ache seu personal trainer ou seu próximo cliente",
  description:
    "Conectamos personal trainers e clientes, presencial ou online, por assinatura.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>
        <UserProvider>{children}</UserProvider>
      </body>
    </html>
  );
}
import { Analytics } from '@vercel/analytics/react';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>
        {children}
        <Analytics /> {/* <--- Adicione aqui */}
      </body>
    </html>
  );
}