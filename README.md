# Match Fit — Fase 3 (Supabase + autenticação real + Stripe)

App de match entre personal trainers e clientes, presencial ou online, com
modelo de assinatura para os dois lados.

## Como configurar (obrigatório antes de rodar)

1. Crie uma conta e um projeto gratuito em https://supabase.com
2. No painel do projeto, vá em **SQL Editor** e rode todo o conteúdo de
   `supabase/schema.sql` — isso cria as tabelas, policies de segurança (RLS)
   e o trigger que gera um match quando os dois lados se curtem.
   - Se você já rodou o `schema.sql` antes, só rode as migrações que
     faltarem, na ordem: `migration_2_chat.sql`, `migration_3_swipe_delete.sql`,
     `migration_4_matches_delete.sql` e `migration_5_avatar_storage.sql`.
3. Em **Project Settings > API**, copie a **Project URL** e a **anon public key**.
4. Copie `.env.local.example` para `.env.local` e cole esses dois valores.
5. (Recomendado só pra testar mais rápido) Em **Authentication > Providers >
   Email**, desmarque "Confirm email" — assim o cadastro já cria a sessão na
   hora, sem precisar clicar em link de confirmação no e-mail.
6. Em **Database > Replication**, confira se a tabela `messages` está com o
   Realtime habilitado (o `migration_2_chat.sql` já faz isso via SQL, mas
   vale conferir no painel se aparecer algum erro).

## Como rodar localmente

```bash
npm install
npm run dev
```

Depois acesse http://localhost:3000

## O que já está pronto nessa fase

- **Autenticação real** com Supabase Auth (`/cadastro` e `/login`), sessão
  gerenciada por cookies via `@supabase/ssr` (`lib/supabase/client.ts`,
  `lib/supabase/server.ts`, `middleware.ts`)
- `/match`, `/perfil` e `/configuracoes` são protegidas — sem login, o
  middleware redireciona pra `/login`
- **Banco de dados real** (`supabase/schema.sql`): perfis, perfis de
  treinador/cliente, swipes, matches e uma tabela `subscriptions` já
  preparada pra Fase 3
- **Match mútuo automático**: quando os dois lados se curtem, um trigger no
  banco cria a linha em `matches` — a tela já mostra "É um match!" quando
  isso acontece de verdade, com um botão pra ir direto ao chat
- **`/matches`** — lista todos os seus matches, então mesmo quem curtiu
  primeiro (e não viu o aviso na hora) encontra o match depois aqui
- **`/chat/[matchId]`** — conversa em tempo real (Supabase Realtime) entre
  cliente e treinador depois do match, com bolhas de mensagem e rolagem
  automática
- Menu de perfil (avatar + nome) com acesso a Perfil e Configurações
- Configurações permite trocar modalidade preferida, ativar/cancelar
  assinatura (ainda sem cobrança real) e sair da conta

## Atualização: chat e correções (depois do teste da Fase 2)

Você já rodou o `schema.sql` uma vez, então **só precisa rodar
`supabase/migration_2_chat.sql`** no SQL Editor — ele cria a tabela de
mensagens, as policies de segurança e habilita o Realtime.

O que mudou nessa rodada:
- **Chat em tempo real** depois do match: `/matches` lista todos os seus
  matches, e cada um abre `/chat/[matchId]` com mensagens ao vivo (Supabase
  Realtime — não precisa recarregar a página pra ver a mensagem do outro lado)
- **Corrigido:** quando dá match, agora aparece um botão "Ir para o chat"
  direto na tela de match
- **Corrigido:** antes, só quem "fechava" o match (o segundo a curtir) via a
  mensagem — quem curtiu primeiro nunca saberia que rolou match. Agora `/matches`
  mostra o match pros dois lados, sempre
- **Corrigido:** os cartões mostravam "X km de você" com um `?` no lugar do
  número, porque a distância real ainda não existe (isso é Fase 4). Troquei
  por um selo simples ("Atende presencial" / "Busca aula online") e um aviso
  extra ("Também atende online/presencial") quando o perfil aceita os dois
  modos — antes isso ficava escondido atrás da aba que você estava vendo
- **Corrigido:** um `useEffect` no menu de perfil estava depois de um
  `return` condicional, o que quebra as regras dos Hooks do React e travava
  a tela ao carregar a sessão

## Testando sem configurar o Stripe

Agora que a assinatura trava a busca de verdade (só quem tem
`subscription_active = true` aparece nas buscas e consegue buscar), você
**não vai ver ninguém em `/match`** até ter uma assinatura ativa — e ativar
de verdade exige o Stripe configurado.

Pra testar o resto do app (match, swipe, chat) sem mexer no Stripe ainda:

1. No Supabase, abra **Table Editor > profiles**
2. Ache a linha das suas contas de teste e edite a coluna
   `subscription_active` pra `true` manualmente
3. Pronto — essas contas já aparecem nas buscas uma da outra

Isso é só pra teste. Depois que o Stripe estiver configurado, o próprio
webhook cuida de manter esse campo atualizado sozinho.

## Atualização: upload de foto e correção do match falso

Rode `supabase/migration_4_matches_delete.sql` e
`supabase/migration_5_avatar_storage.sql` no SQL Editor (nessa ordem, se
ainda não rodou).

- **Upload de foto de perfil**: em `/configuracoes`, agora dá pra trocar sua
  foto. Ela aparece no menu de perfil e nos cartões de match de verdade.
- **Corrigido — match sem a outra parte curtir**: o botão "limpar swipes"
  apagava só a tabela de swipes, não os matches antigos. Se duas contas já
  tinham dado match num teste anterior, o match antigo continuava no banco
  — e na próxima curtida de um lado só, o app achava esse match antigo e
  mostrava "é um match!" incorretamente. Agora: (1) o botão de limpar também
  apaga seus matches antigos, e (2) a checagem de match passou a conferir a
  reciprocidade direto nos swipes atuais, então mesmo que sobre algum match
  antigo por aí, ele não é mais confundido com um match novo.
- **Sobre apagar contas de teste**: se você apagar só a linha da tabela
  `profiles` no Table Editor, a conta de login continua existindo — por
  isso o cadastro reclama de "usuário já registrado". Pra apagar de vez,
  apague em **Authentication > Users** (isso cascade-apaga o perfil, os
  swipes, matches e mensagens relacionados automaticamente).

## Atualização: paywall de assinatura + correções de cadastro/avatar/checkout

- **Corrigido — trava de assinatura incompleta**: no patch anterior eu
  adicionei a exigência de assinatura ativa pra aparecer nas buscas, mas
  deixei a tela de match presa em "Buscando perfis..." pra sempre quando a
  assinatura não estava ativa. Agora existe uma tela de "Assine pra
  continuar" de verdade, com link pra `/configuracoes`.
- **Corrigido — cadastro "travado"**: se a confirmação de e-mail estiver
  ativada no seu projeto Supabase, a conta é criada mas sem sessão ativa —
  o cadastro agora avisa isso claramente em vez de tentar seguir em frente
  sem sessão.
- **Melhorado — upload de foto**: agora mostra uma prévia da imagem
  escolhida e só salva de verdade quando você clica em "Salvar foto"
  (com mensagem de confirmação), em vez de subir a imagem na hora que você
  seleciona o arquivo.
- **Corrigido — erro genérico no checkout**: se `STRIPE_SECRET_KEY` não
  estiver configurada, o botão de assinar agora mostra a mensagem real do
  erro em vez de um genérico "falha de conexão".

## Atualização: painel de admin, pagamento e geolocalização real

Rode, nessa ordem, no SQL Editor: `migration_6_lock_subscription_column.sql`
e `migration_7_admin.sql`.

**Depois de rodar a migração 7**, torne sua própria conta admin — troque o
e-mail e rode no SQL Editor:
```sql
update profiles set is_admin = true
where id = (select id from auth.users where email = 'seu-email@exemplo.com');
```

- **Painel de administração** (`/admin`, só visível pra quem é admin — link
  aparece no menu de perfil): lista todos os usuários, com opção de
  **banir/desbanir**, **forçar desativação de assinatura** e **apagar conta
  permanentemente**. Apagar por aqui usa a API de admin do Supabase de
  verdade — cascade-apaga perfil, swipes, matches e mensagens, então não
  fica mais nenhum resquício que impeça recadastrar o mesmo e-mail depois.
- **Conta banida**: a sessão é encerrada sozinha na próxima vez que a
  pessoa tentar carregar qualquer página do app.
- **Segurança**: ninguém mais consegue ativar a própria assinatura, se
  tornar admin ou se desbanir direto pelo navegador (mesmo abrindo o
  DevTools) — essas colunas só mudam via service_role, depois de validação
  no servidor.
- **Corrigido — pagamento não refletia no site**: além do webhook, agora
  existe uma segunda confirmação: ao voltar do Checkout, o app confirma o
  pagamento direto com o Stripe (`/api/checkout/sync`) e atualiza a
  assinatura na hora — não depende só do webhook estar ativo. **Mas o
  motivo mais provável do que você viu continua sendo**: o
  `stripe listen --forward-to localhost:3000/api/webhooks/stripe` precisa
  estar rodando num terminal separado enquanto você testa localmente.
- **Geolocalização real**: em Configurações, dá pra clicar em "Usar minha
  localização" (usa o GPS/localização do navegador). No modo presencial, a
  distância exibida nos cartões agora é calculada de verdade, e o filtro de
  distância já funciona. Se você (ou a outra conta) ainda não definiu
  localização, o filtro é ignorado em vez de esconder todo mundo.

## Atualização: modelo "vê de graça, paga pra falar" + 2 bugs corrigidos

Rode, nessa ordem: `migration_8_profile_location.sql` e
`migration_9_paid_messaging.sql`.

- **Mudança de modelo**: navegar, filtrar e dar match agora é de graça pros
  dois lados. A assinatura só é exigida pra **mandar mensagem** no chat
  depois do match — reforçado tanto na interface (o campo de mensagem vira
  um botão "Ver planos" se não tiver assinatura) quanto no banco (a policy
  de RLS da tabela `messages` já bloqueia o insert se `subscription_active`
  for `false`, então nem manipulando o navegador dá pra burlar).
- **Corrigido — "Could not find the 'location_lat' column of 'profiles'"**:
  eu tinha esquecido de adicionar essas colunas na tabela `profiles`
  (só `client_profiles` tinha). Corrigido no schema e na migração 8.
- **Corrigido — "Cannot coerce the result to a single JSON object"**: esse
  erro aparecia quando uma conta de login existia mas não tinha uma linha
  correspondente em `profiles` (geralmente sobra de teste antigo). Agora
  isso mostra uma mensagem clara e encerra a sessão, em vez do erro cru do
  Postgres — mas se você já tem uma conta assim, o jeito de resolver
  continua sendo apagar ela em **Authentication > Users** no Supabase e
  cadastrar de novo.

## Atualização: navegação mais confiável + swipe ajustado

- **Corrigido — guia anônima caindo no login depois do cadastro/login**:
  troquei a navegação de `router.push` (troca de página "suave", só no
  cliente) por um redirecionamento completo (`window.location.href`) logo
  após criar a conta ou entrar. Isso evita uma corrida entre o cookie de
  sessão sendo gravado e a página seguinte checar se você está logado —
  modo anônimo costuma ser mais rígido com isso.
- **Ajuste no swipe sem assinatura**: agora dá pra arrastar o cartão
  normalmente mesmo sem assinar — só que arrastar pra direita (que seria
  "curtir") te leva direto pra tela de planos, e arrastar pra esquerda só
  passa pro próximo perfil (sem gravar nada no banco).

## Atualização: segurança e tela de planos

Rode `migration_11_input_limits.sql` e `migration_12_lock_subscriptions_table.sql`.

**⚠️ Se você já subiu esse projeto pro GitHub antes desse patch:** eu não
tinha criado um `.gitignore` até agora, o que significa que seu
`.env.local` (com chave secreta do Stripe e service role do Supabase) pode
ter sido commitado. Se foi, **troque todas essas chaves agora** (Stripe:
gere uma nova secret key e desative a antiga; Supabase: Project Settings >
API > "Roll" na service_role key) e confirme que o `.gitignore` está sendo
respeitado no próximo commit.

### O que foi reforçado

- **`.gitignore` criado** — protege `.env.local`, `node_modules` e a pasta
  `android/` (gerada localmente) de irem pro Git
- **Headers de segurança HTTP**: `X-Frame-Options` (anti-clickjacking),
  `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` e
  `Strict-Transport-Security`, além de esconder o header `X-Powered-By`
- **Tabela `subscriptions` travada**: o usuário não conseguia mais gravar
  nada nela direto pelo navegador (só o servidor, via checkout e webhook)
  — antes ele podia reescrever o próprio status, sem efeito prático real
  (o acesso depende de `profiles.subscription_active`, que já era
  protegido), mas era uma porta que não devia estar aberta
- **Limites de tamanho no banco** (mensagens, nome, bio, especialidade,
  objetivo) — reforço contra alguém tentando abusar da API direto, além do
  limite que já existe no front-end
- **Limitação conhecida e aceita**: qualquer usuário autenticado ainda
  consegue *ler* se outra conta é admin/banida (não conseguem *mudar*
  isso). É baixo risco (não expõe senha, pagamento ou conversas), mas se
  quiser, dá pra fechar isso depois com uma view separada — me avisa se
  quiser que eu faça

### Tela de planos (`/planos`)

Troquei o botão simples de "Assinar" por uma tela de verdade, com:
- Preço real (busca direto do Stripe, nunca fica desatualizado)
- Lista de benefícios específica pra cliente ou personal trainer
- Estado de "assinatura ativa" com botão de gerenciar
- Todos os lugares que levavam pra assinar (chat, swipe sem assinatura,
  perfil) agora apontam pra cá. `/configuracoes` ficou só com o status
  resumido e um link pra essa tela

## Atualização: segurança aprofundada

Rode `migration_14_admin_audit_log.sql`.

### O que foi reforçado

- **Senha mínima de 8 caracteres** (era 6)
- **Content-Security-Policy** — restringe de onde o navegador pode
  carregar script/imagem/fonte/conexão, reduzindo bastante o estrago de um
  eventual XSS
- **Proteção contra CSRF** nas rotas que mexem com dinheiro ou conta
  (checkout, portal, sync, ações de admin) — elas agora conferem se a
  requisição veio do próprio site antes de fazer qualquer coisa
- **Log de auditoria de admin** (`admin_audit_log`, visível no final do
  painel `/admin`): toda ação de banir/desbanir/desativar/apagar fica
  registrada com quem fez, em quem, e quando — inclusive serve pra
  rastrear uso indevido por outro admin, se algum dia você tiver mais de
  um

### Dois achados que decidi documentar em vez de já implementar

Essas duas mudanças são maiores e mexem em partes centrais do app — achei
melhor te avisar antes de fazer, em vez de simplesmente aplicar:

1. **Coordenadas exatas de outras pessoas chegam no navegador**: hoje, pra
   calcular a distância no modo presencial, a latitude/longitude de quem
   você está vendo é enviada pro seu navegador (o cálculo acontece no seu
   lado). Um usuário mal-intencionado tecnicamente conseguiria extrair a
   localização exata de quem deu match, não só a distância aproximada. O
   jeito certo de resolver é mover esse cálculo pro banco (uma função no
   Postgres que já devolve só a distância pronta, nunca as coordenadas
   cruas) — é uma mudança arquitetural, não um ajuste pequeno.
2. **Qualquer conta logada consegue ler se outra conta é admin/banida**
   (não consegue mudar isso, só ler). Baixo risco — não expõe senha,
   pagamento ou conversa — mas fechar isso de vez exige reestruturar como
   o perfil é lido (função seria pra "meu próprio perfil" e colunas
   restritas pra "perfil de terceiros").

Se quiser, eu implemento os dois no próximo patch — só não quis fazer uma
mudança grande dessas sem confirmar com você antes.

### Duas configurações que valem a pena ativar direto no painel do Supabase (não são código)

- **Authentication > Providers > Email > Minimum password length**: suba
  de 6 pra pelo menos 8, pra bater com o que o front-end já exige
- **Authentication > Attack Protection > Enable CAPTCHA protection**: o
  Supabase tem suporte nativo a CAPTCHA (Cloudflare Turnstile, que é
  gratuito) no cadastro/login — ajuda bastante contra criação de contas em
  massa por bot. Precisa criar uma conta grátis no Cloudflare Turnstile
  pra pegar a chave; se quiser, eu conecto isso no código depois que você
  tiver a chave

## O que ainda é placeholder / fake

- **Avaliação (rating)**: os treinadores aparecem sempre com nota 5.0 fixa —
  sistema de avaliação real ainda não foi construído

## Se algo não aparecer (troubleshooting)

1. **Apague a pasta antiga inteira** antes de extrair o zip novo — não
   extraia por cima, senão arquivos removidos/renomeados de versões antigas
   podem ficar misturados com os novos.
2. Rode `npm install` de novo (peguei novas dependências em algumas fases).
3. Pare o servidor (`Ctrl+C`) e rode `npm run dev` de novo — o Next.js às
   vezes mantém cache de rotas antigas.
4. Dê um hard refresh no navegador (Ctrl+Shift+R ou Cmd+Shift+R).
5. Se um personal trainer não aparece pro cliente: abra o **Table Editor**
   no Supabase e confira se existe uma linha correspondente em
   `trainer_profiles` pra esse usuário — se não existir, o cadastro falhou
   silenciosamente nessa parte (bug já corrigido no código, mas contas
   criadas antes da correção podem ter ficado sem esse perfil). Se for o
   caso, o mais simples é apagar o usuário em **Authentication > Users** e
   cadastrar de novo.
6. Se a navegação entre páginas estiver lenta: o middleware valida sua
   sessão com o Supabase a cada troca de página, então parte da demora
   normal é essa ida e volta de rede. Se o seu projeto Supabase não estiver
   na região São Paulo, isso pode pesar mais — dá pra conferir/mudar em
   **Project Settings > General** (mudar de região exige recriar o projeto).

## Fase 3: configurando o Stripe (assinatura de verdade)

1. Crie uma conta em https://stripe.com (o modo de teste já vem ativado —
   use ele enquanto desenvolve, nenhum cartão real é cobrado)
2. Em **Product catalog**, crie dois produtos recorrentes: um pro plano do
   **cliente** e outro pro plano do **personal trainer**. Copie o ID de
   cada **preço** (começa com `price_...`)
3. Em **Developers > API keys**, copie a **Secret key** (começa com
   `sk_test_...`)
4. Em **Settings > Billing > Customer portal** (ainda em modo de teste),
   clique em **Activate test link** se ainda não estiver ativo — sem isso,
   o botão "Gerenciar" (Portal de Cobrança) dá erro
5. Instale a Stripe CLI (https://docs.stripe.com/stripe-cli) e rode, num
   terminal separado enquanto testa localmente:
   ```bash
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```
   Ela vai imprimir um `whsec_...` — copia esse valor
6. No Supabase, em **Project Settings > API**, copie a **service_role key**
   (é secreta — nunca cole isso em código que roda no navegador)
7. Preencha todas essas variáveis no seu `.env.local` (veja
   `.env.local.example` pra saber o nome de cada uma)
8. Rode `npm install` de novo (peguei a dependência `stripe`) e reinicie o
   servidor (`Ctrl+C` e `npm run dev` de novo — o Next.js só lê o
   `.env.local` na hora que o servidor sobe)
9. Deixe o `stripe listen` do passo 5 rodando num terminal separado
   enquanto testa — é ele que entrega os eventos pro seu webhook local

**Pra testar um pagamento de verdade (sem cobrar nada):** no Checkout do
Stripe, use o cartão de teste `4242 4242 4242 4242`, qualquer data futura,
qualquer CVC e qualquer CEP.

Com isso, o botão "Assinar" em `/configuracoes` abre o Checkout de verdade
do Stripe, e "Gerenciar" (quando já está ativa) abre o Portal de Cobrança
do Stripe pra trocar cartão ou cancelar. O webhook (`/api/webhooks/stripe`)
atualiza `subscription_active` sozinho quando o pagamento é confirmado, é
renovado, falha ou é cancelado — não existe mais nenhum botão que só finge
ativar a assinatura.

## Empacotando pra Android com Capacitor

**Por que funciona diferente de um app Capacitor "normal":** esse projeto
usa rotas de servidor do Next.js (login, checkout do Stripe, webhook,
middleware de autenticação) — não dá pra exportar como arquivos estáticos.
Por isso o app Android vai ser uma casca fina que abre o **site publicado
de verdade** dentro de uma WebView nativa (o mesmo padrão que apps como
Twitter/X Lite usam). Ou seja: você precisa publicar o site antes.

### 1. Publique o site (recomendado: Vercel, feito pra Next.js)

1. Crie conta em https://vercel.com e conecte o repositório do projeto
   (suba pro GitHub primeiro, se ainda não tiver feito)
2. Em **Settings > Environment Variables**, cole TODAS as variáveis do seu
   `.env.local` (Supabase, Stripe, etc.)
3. Troque `NEXT_PUBLIC_SITE_URL` pro domínio real que a Vercel te der (ex:
   `https://match-fit.vercel.app`)
4. No Stripe, crie um endpoint de webhook de produção (Developers >
   Webhooks > Add endpoint) apontando pra
   `https://match-fit.vercel.app/api/webhooks/stripe` — isso substitui o
   `stripe listen` que só serve pra desenvolvimento local. Copie o novo
   `whsec_...` e atualize `STRIPE_WEBHOOK_SECRET` na Vercel

### 2. Instale os pré-requisitos (na sua máquina)

- Android Studio (https://developer.android.com/studio) — instala o SDK
  do Android junto
- Node.js (você já deve ter, pra rodar o projeto)

### 3. Gere o projeto Android

```bash
npm install
npx cap add android
```

Isso cria uma pasta `android/` com o projeto nativo (não incluí ela nesse
zip porque é gerada na hora, específica da sua máquina).

Edite o `capacitor.config.ts` e troque `PRODUCTION_URL` pela URL real do
seu site publicado (a mesma da Vercel).

```bash
npm run cap:sync
npm run cap:open
```

O último comando abre o Android Studio com o projeto pronto. De lá, clique
em **Run** (▶) com um emulador ou celular conectado por USB (com "Depuração
USB" ativada no celular) pra testar o app de verdade.

### 4. Ícone e splash screen (opcional, mas recomendado)

```bash
npm install -D @capacitor/assets
```
Coloque uma imagem `icon.png` (1024x1024) e `splash.png` (2732x2732) numa
pasta `assets/` na raiz, depois rode `npx capacitor-assets generate` — ele
gera todos os tamanhos que o Android precisa automaticamente.

### 5. Publicando na Play Store

1. Crie uma conta em https://play.google.com/console (taxa única de $25)
2. No Android Studio: **Build > Generate Signed Bundle / APK** → escolha
   **Android App Bundle**, crie uma chave de assinatura (guarde ela bem —
   sem ela você não consegue atualizar o app depois) e gere o `.aab`
3. No Play Console, crie um novo app, preencha a ficha da loja (descrição,
   screenshots, ícone) e faça upload do `.aab`
4. **Você vai precisar de uma política de privacidade publicada** (URL
   pública) — obrigatório pro Google Play, ainda mais coletando
   localização e dados de perfil. Pode ser uma página simples no próprio
   site
5. Contas novas no Google Play geralmente precisam passar por um período
   de teste fechado (mínimo de testadores por ~14 dias) antes de liberar
   pra todo mundo — o próprio Play Console te guia nesse processo

**Depois de publicado:** se eu corrigir algo no site (bugs, features), o
app atualiza sozinho pra quem já instalou — ele só está carregando sua URL.
Só precisa passar pela revisão da loja de novo se mudar algo nativo (ícone,
permissões, nome do pacote).

## Atualização: agendamento de sessão (completando a Fase 4)

Rode `migration_13_sessions.sql` se ainda não rodou.

Dentro do chat, depois do match:
- Botão **"Marcar sessão"** (só aparece pra quem assina) abre um formulário
  de data/horário
- A outra pessoa vê a proposta e pode **Confirmar** ou **Recusar**
- Sessão confirmada aparece com ✓, qualquer um dos dois pode cancelar
  depois
- Tudo em tempo real (Realtime) — não precisa recarregar a página pra ver
  a resposta

Com isso, todo o roadmap original está implementado. O que resta é:
publicar de verdade (Vercel) e as duas melhorias de segurança que
documentei acima, se você quiser aprofundar ainda mais.

## Atualização: correção de origem (Vercel) + verificação de CREF

Rode `migration_15_cref_region.sql`.

- **Corrigido — "Origem não permitida" na Vercel**: a checagem de CSRF
  comparava só com `NEXT_PUBLIC_SITE_URL`. Agora também aceita
  automaticamente a URL que a própria Vercel gera em cada deploy
  (`VERCEL_URL`), então funciona mesmo que essa variável não esteja
  perfeitamente atualizada. As URLs de sucesso/cancelamento do
  checkout e do portal usam esse mesmo helper agora (`getSiteUrl()`
  em `lib/security.ts`) — nada mais fixo em `localhost`.
- **Verificação de CREF**: não existe API oficial única (o CREF é
  organizado por região, cada uma com seu próprio site de consulta) —
  então implementei o caminho honesto:
  - Cadastro de personal trainer agora pede número e região do CREF
  - `/admin` lista quem está pendente, com um link direto pro site de
    consulta certo daquela região, e um botão "Verificar CREF"
  - Depois de verificado, aparece um selo "✓ CREF verificado" no cartão
    do treinador pro cliente ver

## Atualização: origem corrigida de vez + restrição de e-mail

- **Corrigido de vez — "Origem não permitida"**: a causa raiz era que
  `VERCEL_URL` reflete a URL específica de cada deploy (com um hash único),
  não o domínio "bonito" que você realmente usa. Troquei a lógica: agora
  compara o Origin da requisição com o Host dela mesma, sem depender de
  nenhuma variável de ambiente — não tem mais como isso ficar
  desatualizado.
- **E-mails restritos a provedores conhecidos**: cadastro agora só aceita
  e-mails de uma lista de provedores reais (Gmail, Outlook, Yahoo, iCloud,
  UOL, etc. — lista completa em `lib/email-validation.ts`, fácil de
  editar se quiser adicionar algum). Bloqueia e-mails temporários e
  domínios inventados.
  - **Limitação importante**: essa checagem é só no front-end. Alguém
    tecnicamente decidido consegue contornar abrindo o DevTools e chamando
    o Supabase direto. Pra fechar de vez (reforço no servidor), o
    Supabase tem um recurso de "Auth Hooks" (Authentication > Hooks >
    "Before user created") que roda uma função no banco antes de
    qualquer cadastro — dá pra bloquear lá também. Não implementei isso
    ainda porque a configuração exata varia de painel pra painel; se
    quiser, no próximo patch eu escrevo a função SQL e te guio pra
    ativar o hook.

## Próximas fases

1. Publicar o site (Vercel) — desbloqueia o Capacitor/Play Store de verdade
2. Os dois achados de segurança documentados acima, se quiser fechá-los
