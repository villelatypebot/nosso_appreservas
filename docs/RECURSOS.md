# Recursos do Sistema

Esta é a lista consolidada dos recursos atualmente disponíveis neste projeto.

## 1. Whitelabel e onboarding

- setup inicial em `/setup`
- criação do primeiro admin
- criação do primeiro estabelecimento
- cadastro da identidade da marca
- edição posterior da marca em `/admin/dashboard/personalizacao`
- nome, logo, cores e descrição refletidos nas telas públicas e no admin
- ícone e manifesto PWA dinâmicos
- prefixo do código da reserva configurável

## 2. Estrutura multiestabelecimento

- múltiplos estabelecimentos no mesmo projeto
- listagem pública apenas dos estabelecimentos ativos
- criação e edição de estabelecimentos no admin
- ativação e desativação de estabelecimentos
- slug público por estabelecimento

## 3. Experiência pública

- home pública com os estabelecimentos ativos
- página de reserva por estabelecimento em `/reservar/[unitSlug]`
- etapa guiada de reserva
- tela “Minha Reserva” para consulta e edição por código
- layout responsivo para mobile

## 4. Motor de reservas

- validação server-side de:
  - mínimo e máximo de pessoas
  - antecedência mínima
  - antecedência máxima
  - bloqueios por data
  - horários ativos
  - capacidade do ambiente
  - conflito de mesma semana por telefone
- edição da reserva pelo cliente com validação
- geração automática de código de confirmação
- logs melhores para falhas críticas de criação

## 5. Proteção contra overbooking

- fallback server-side validando slot e lotação
- migration `004_reservation_guards.sql` para proteção atômica no banco
- rotas preparadas para usar as funções SQL de criação segura

## 6. Painel administrativo global

- dashboard com métricas gerais
- reservas recentes
- acesso rápido aos estabelecimentos
- gestão de usuários administrativos
- gestão de estabelecimentos
- tela de personalização da marca
- navegação mobile com drawer

## 7. Painel por estabelecimento

- reservas
- painel operacional
- relatórios
- usuários vinculados à unidade
- horários
- regras
- bloqueios
- ambientes
- webhooks
- follow-ups

## 8. Notificações push

- inscrição de navegador/PWA para push
- teste manual de push no admin
- envio automático de push em eventos de reserva
- conteúdo customizado com nome da unidade e dados da reserva
- suporte a PWA instalado no iPhone e Android, conforme compatibilidade do navegador

## 9. Webhooks e integrações

- cadastro de webhooks por estabelecimento
- disparo de teste de webhook
- logs de webhook
- assinatura `X-Reservation-Signature`
- cabeçalho `X-Reservation-Event`

## 10. Assistência conversacional e CRM

- endpoint de verificação de disponibilidade: `/api/availability/check`
- endpoint de assistência conversacional: `/api/conversation/assist`
- endpoint de geração de follow-ups: `/api/followups/generate`
- respostas pensadas para:
  - checar disponibilidade
  - reenviar link de reserva
  - pedir dados faltantes
  - evitar promessa falsa de link enviado

Observação:

- o envio real de WhatsApp e a automação do CRM externo dependem do fluxo externo consumir esses endpoints; esse repositório não inclui o provedor de WhatsApp em si

## 11. Segurança operacional

- middleware protegendo páginas do admin
- setup inicial com trava para primeira instalação
- APIs administrativas agora protegidas por sessão e papel administrativo
- papéis administrativos:
  - `admin`
  - `manager`
  - `operator`

## 12. Qualidade e operação

- smoke test automatizado com `npm run smoke:test`
- lint com `npm run lint`
- validação de tipos com `npx tsc --noEmit`
- fallback seguro quando o push não estiver configurado

## 13. Banco de dados

Tabelas principais:

- `units`
- `business_settings`
- `environments`
- `time_slots`
- `reservation_rules`
- `date_blocks`
- `customers`
- `reservations`
- `webhooks`
- `webhook_logs`
- `follow_up_rules`
- `reminder_logs`
- `admin_users`
- `push_subscriptions`

## 14. Recursos que o cliente pode configurar sem código

- nome da marca
- nome curto
- tagline
- descrição
- contatos
- logo por URL
- cores
- prefixo do código da reserva
- estabelecimentos
- horários
- regras
- ambientes
- bloqueios
- webhooks
- usuários do admin
- push no admin
