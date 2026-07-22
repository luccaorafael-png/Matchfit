-- Migração incremental: impede que um usuário logado ative a própria
-- assinatura direto pelo navegador (ex: chamando o Supabase no console do
-- DevTools), sem passar pelo Stripe de verdade.
--
-- A partir daqui, só quem usa a service_role key (o webhook do Stripe e a
-- rota /api/checkout/sync, que confirma o pagamento direto com o Stripe
-- antes de escrever) consegue mudar essa coluna. O app continua
-- funcionando normalmente pros outros campos do perfil (nome, foto,
-- modalidade, localização).

revoke update (subscription_active) on profiles from authenticated;
