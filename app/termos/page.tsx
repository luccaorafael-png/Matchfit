import Link from "next/link";

export const metadata = {
  title: "Termos de Uso — Match Fit",
};

export default function Termos() {
  return (
    <main className="min-h-screen px-6 py-12">
      <div className="max-w-2xl mx-auto text-chalk/80 text-sm leading-relaxed space-y-6">
        <Link href="/" className="text-chalk/50 text-sm">
          ← Voltar
        </Link>

        <h1 className="font-display text-2xl uppercase tracking-wide text-chalk">
          Termos de Uso
        </h1>
        <p className="text-chalk/50 text-xs">
          Última atualização: {new Date().toLocaleDateString("pt-BR")}
        </p>

        <p>
          Ao criar uma conta no Match Fit, você concorda com os termos
          abaixo.
        </p>

        <h2 className="font-display text-lg uppercase tracking-wide text-chalk pt-4">
          1. O que é o Match Fit
        </h2>
        <p>
          O Match Fit é uma plataforma que conecta pessoas buscando personal
          trainers com profissionais de educação física, presencial ou
          online. Não somos uma academia, clínica ou prestadora de serviços
          de treino — apenas facilitamos o contato entre as partes.
        </p>

        <h2 className="font-display text-lg uppercase tracking-wide text-chalk pt-4">
          2. Cadastro e elegibilidade
        </h2>
        <ul className="list-disc list-inside space-y-1">
          <li>Você precisa ter 18 anos ou mais para criar uma conta</li>
          <li>As informações fornecidas no cadastro devem ser verdadeiras</li>
          <li>
            Personal trainers são responsáveis por manter seu registro
            profissional (CREF) válido e regular
          </li>
          <li>
            Não verificamos automaticamente a formação ou aptidão física de
            clientes nem a qualificação de treinadores além da checagem
            manual de CREF — a responsabilidade pela avaliação de aptidão
            física antes de iniciar qualquer atividade é de cada usuário
          </li>
        </ul>

        <h2 className="font-display text-lg uppercase tracking-wide text-chalk pt-4">
          3. Assinatura e pagamento
        </h2>
        <p>
          O acesso a recursos de contato (curtir, dar match e conversar)
          depende de assinatura paga, processada pelo Stripe. A assinatura
          é recorrente e pode ser cancelada a qualquer momento pelo Portal
          de Cobrança, disponível na tela de planos. Não fazemos reembolso
          de períodos já pagos, salvo exigência legal.
        </p>

        <h2 className="font-display text-lg uppercase tracking-wide text-chalk pt-4">
          4. Conduta esperada
        </h2>
        <p>
          Não toleramos: assédio, discurso de ódio, informações falsas
          sobre identidade ou qualificação profissional, ou uso da
          plataforma para fins diferentes de conectar clientes e personal
          trainers. Contas que violarem essas regras podem ser suspensas ou
          banidas, a critério da administração.
        </p>

        <h2 className="font-display text-lg uppercase tracking-wide text-chalk pt-4">
          5. Isenção de responsabilidade
        </h2>
        <p>
          O Match Fit não se responsabiliza por lesões, danos ou prejuízos
          decorrentes de sessões de treino combinadas entre usuários. A
          relação de prestação de serviço de treino é diretamente entre
          cliente e personal trainer — não somos parte dela.
        </p>

        <h2 className="font-display text-lg uppercase tracking-wide text-chalk pt-4">
          6. Alterações nestes termos
        </h2>
        <p>
          Podemos atualizar estes termos periodicamente. Mudanças
          relevantes serão comunicadas dentro do app.
        </p>

        <h2 className="font-display text-lg uppercase tracking-wide text-chalk pt-4">
          7. Contato
        </h2>
        <p>
          Dúvidas sobre estes termos? Entre em contato:{" "}
          <strong>[coloque seu e-mail de contato aqui]</strong>.
        </p>

        <p className="text-chalk/40 text-xs pt-6 border-t border-chalk/10">
          Este documento é um modelo inicial e não substitui orientação
          jurídica. Recomendamos revisão por um advogado antes de
          considerá-lo definitivo, especialmente à medida que o app
          cresce.
        </p>
      </div>
    </main>
  );
}
