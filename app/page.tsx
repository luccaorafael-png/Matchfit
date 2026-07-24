import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <span className="text-teal font-mono text-xs tracking-widest uppercase mb-4">
        Match Fit
      </span>
      <h1 className="font-display text-4xl md:text-6xl uppercase tracking-wide leading-tight">
        Ache seu treino.
        <br />
        <span className="text-coral">Ache seu cliente.</span>
      </h1>
      <p className="text-chalk/70 mt-6 max-w-md">
        Conectamos personal trainers e clientes, presencial ou online. Dê
        match, marque a sessão e comece a treinar.
      </p>

      <div className="flex gap-4 mt-8">
        <Link
          href="/cadastro"
          className="bg-coral text-ink font-medium px-6 py-3 rounded-full hover:bg-coral-dark transition"
        >
          Criar conta
        </Link>
        <Link
          href="/login"
          className="border border-chalk/30 text-chalk px-6 py-3 rounded-full hover:bg-ink-light transition"
        >
          Já tenho conta
        </Link>
      </div>
    </main>
  );
}
