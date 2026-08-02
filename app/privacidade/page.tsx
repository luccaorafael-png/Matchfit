import Link from "next/link";

export const metadata = {
  title: "Política de Privacidade — Match Fit",
};

export default function Privacidade() {
  return (
    <main className="min-h-screen px-6 py-12">
      <div className="max-w-2xl mx-auto text-chalk/80 text-sm leading-relaxed space-y-6">
        <Link href="/" className="text-chalk/50 text-sm">
          ← Voltar
        </Link>

        <h1 className="font-display text-2xl uppercase tracking-wide text-chalk">
          Política de Privacidade
        </h1>
        <p className="text-chalk/50 text-xs">
          Última atualização: {new Date().toLocaleDateString("pt-BR")}
        </p>

        <p>
          Esta política explica quais dados o Match Fit coleta, para que
          usamos, e quais direitos você tem sobre eles, em conformidade com
          a Lei Geral de Proteção de Dados (LGPD).
        </p>

        <h2 className="font-display text-lg uppercase tracking-wide text-chalk pt-4">
          1. Quais dados coletamos
        </h2>
        <ul className="list-disc list-inside space-y-1">
          <li>Nome e e-mail, no momento do cadastro</li>
          <li>
            Tipo de conta (cliente ou personal trainer) e informações
            específicas de cada perfil (objetivo de treino, especialidade,
            preço por sessão, número de CREF)
          </li>
          <li>
            Localização aproximada (latitude/longitude), apenas se você
            optar por fornecer isso em Configurações
          </li>
          <li>Foto de perfil, se você optar por enviar uma</li>
          <li>Mensagens trocadas no chat com outros usuários</li>
          <li>
            Dados de pagamento — processados diretamente pelo Stripe, nosso
            processador de pagamentos. Não armazenamos número de cartão de
            crédito em nossos servidores
          </li>
        </ul>

        <h2 className="font-display text-lg uppercase tracking-wide text-chalk pt-4">
          2. Para que usamos esses dados
        </h2>
        <ul className="list-disc list-inside space-y-1">
          <li>Conectar clientes e personal trainers compatíveis</li>
          <li>Calcular distância aproximada no modo presencial</li>
          <li>Processar assinaturas e pagamentos</li>
          <li>Permitir comunicação entre usuários que deram match</li>
          <li>Prevenir abuso, fraude e contas falsas</li>
        </ul>

        <h2 className="font-display text-lg uppercase tracking-wide text-chalk pt-4">
          3. Com quem compartilhamos dados
        </h2>
        <p>
          Usamos o Supabase para hospedar nosso banco de dados e
          autenticação, e o Stripe para processar pagamentos. Esses
          serviços têm acesso aos dados estritamente necessários para
          cumprir suas funções, e não vendemos dados a terceiros para fins
          de publicidade.
        </p>

        <h2 className="font-display text-lg uppercase tracking-wide text-chalk pt-4">
          4. Seus direitos
        </h2>
        <p>
          Você pode, a qualquer momento: acessar os dados que temos sobre
          você, corrigir informações incorretas, solicitar a exclusão da
          sua conta (o que apaga permanentemente seu perfil, mensagens e
          dados associados), e revogar o consentimento para uso de
          localização (basta não preenchê-la ou apagar essa informação em
          Configurações).
        </p>
        <p>
          Para exercer esses direitos, entre em contato pelo e-mail
          informado na seção de contato abaixo.
        </p>

        <h2 className="font-display text-lg uppercase tracking-wide text-chalk pt-4">
          5. Segurança
        </h2>
        <p>
          Adotamos medidas técnicas para proteger seus dados, incluindo
          criptografia em trânsito (HTTPS), controle de acesso por conta, e
          políticas de segurança no banco de dados que restringem cada
          usuário a ver apenas os dados aos quais tem permissão.
        </p>

        <h2 className="font-display text-lg uppercase tracking-wide text-chalk pt-4">
          6. Contato
        </h2>
        <p>
          Dúvidas sobre esta política ou sobre seus dados? Entre em contato
          pelo e-mail: <strong>[coloque seu e-mail de contato aqui]</strong>.
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
