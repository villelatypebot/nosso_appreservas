# Apresentação do Sistema de Reservas Whitelabel

## Visão geral

Este projeto é um sistema de reservas whitelabel, pronto para ser instalado e personalizado para diferentes negócios.

Na prática, isso significa que o cliente recebe uma plataforma própria, com:

- marca própria
- logo própria
- cores próprias
- estabelecimentos próprios
- painel administrativo próprio
- ambiente próprio no Supabase
- deploy próprio na Vercel

O sistema foi pensado para negócios que precisam profissionalizar reservas, atendimento, organização operacional e experiência do cliente, sem depender de planilhas, mensagens soltas no WhatsApp ou sistemas genéricos demais.

## O que o cliente recebe

O cliente recebe uma solução completa com:

- site público para escolha do estabelecimento e início da reserva
- página de reserva por estabelecimento
- painel administrativo responsivo
- gestão de múltiplos estabelecimentos
- regras de operação e bloqueios
- notificações em tempo real
- suporte a integrações via webhooks
- estrutura pronta para CRM e automações
- processo de instalação guiado

## Para quais negócios esse sistema serve

Este sistema é ideal para operações como:

- restaurantes
- rodízios
- bares
- casas de eventos
- espaços gastronômicos
- operações com múltiplas unidades
- negócios que trabalham com agenda, lotação e confirmação de presença

## Diferenciais do produto

- whitelabel de verdade: o cliente instala no próprio ambiente
- multiestabelecimento no mesmo projeto
- setup inicial simples, sem depender de programador no primeiro uso
- painel administrativo adaptado para desktop e mobile
- experiência pública moderna para conversão de reservas
- validações server-side para evitar erro operacional
- estrutura preparada para integrações com CRM, automações e notificações
- documentação pronta para implantação e uso comercial

## Estrutura do projeto

### 1. Camada pública

Responsável pela experiência do cliente final.

Inclui:

- home pública com listagem dos estabelecimentos ativos
- página de reserva individual por estabelecimento
- página “Minha Reserva” para consulta e edição por código
- manifesto PWA e ícones dinâmicos

Arquivos principais:

- [src/app/page.tsx](/Users/lucasvillela/Desktop/FULL%20CRM/AGENDAMENTOS/fullhouse-reservas/src/app/page.tsx)
- [src/app/reservar/[unitSlug]/page.tsx](/Users/lucasvillela/Desktop/FULL%20CRM/AGENDAMENTOS/fullhouse-reservas/src/app/reservar/[unitSlug]/page.tsx)
- [src/app/minha-reserva/page.tsx](/Users/lucasvillela/Desktop/FULL%20CRM/AGENDAMENTOS/fullhouse-reservas/src/app/minha-reserva/page.tsx)
- [src/components/reservation/ReservationWizard.tsx](/Users/lucasvillela/Desktop/FULL%20CRM/AGENDAMENTOS/fullhouse-reservas/src/components/reservation/ReservationWizard.tsx)
- [src/components/reservation/ClientReservationManager.tsx](/Users/lucasvillela/Desktop/FULL%20CRM/AGENDAMENTOS/fullhouse-reservas/src/components/reservation/ClientReservationManager.tsx)

### 2. Camada whitelabel e branding

Responsável por transformar o sistema em produto replicável para qualquer cliente.

Inclui:

- nome da marca
- nome curto
- descrição pública
- logo
- cores principais
- prefixo do código da reserva
- ícone do aplicativo
- manifesto do PWA

Arquivos principais:

- [src/lib/brand.ts](/Users/lucasvillela/Desktop/FULL%20CRM/AGENDAMENTOS/fullhouse-reservas/src/lib/brand.ts)
- [src/components/branding/BrandMark.tsx](/Users/lucasvillela/Desktop/FULL%20CRM/AGENDAMENTOS/fullhouse-reservas/src/components/branding/BrandMark.tsx)
- [src/app/manifest.ts](/Users/lucasvillela/Desktop/FULL%20CRM/AGENDAMENTOS/fullhouse-reservas/src/app/manifest.ts)
- [src/app/icon.tsx](/Users/lucasvillela/Desktop/FULL%20CRM/AGENDAMENTOS/fullhouse-reservas/src/app/icon.tsx)
- [src/app/apple-icon.tsx](/Users/lucasvillela/Desktop/FULL%20CRM/AGENDAMENTOS/fullhouse-reservas/src/app/apple-icon.tsx)

### 3. Setup inicial

Responsável por permitir que o cliente faça a primeira configuração sozinho.

Inclui:

- cadastro da marca
- cadastro do primeiro administrador
- criação do primeiro estabelecimento
- criação de configurações padrão

Arquivos principais:

- [src/app/setup/page.tsx](/Users/lucasvillela/Desktop/FULL%20CRM/AGENDAMENTOS/fullhouse-reservas/src/app/setup/page.tsx)
- [src/components/setup/SetupWizardClient.tsx](/Users/lucasvillela/Desktop/FULL%20CRM/AGENDAMENTOS/fullhouse-reservas/src/components/setup/SetupWizardClient.tsx)
- [src/app/api/setup/bootstrap/route.ts](/Users/lucasvillela/Desktop/FULL%20CRM/AGENDAMENTOS/fullhouse-reservas/src/app/api/setup/bootstrap/route.ts)

### 4. Painel administrativo global

Responsável pela gestão da operação como um todo.

Inclui:

- dashboard geral
- gestão de usuários administrativos
- gestão de estabelecimentos
- personalização da marca
- navegação responsiva

Arquivos principais:

- [src/app/admin/dashboard/page.tsx](/Users/lucasvillela/Desktop/FULL%20CRM/AGENDAMENTOS/fullhouse-reservas/src/app/admin/dashboard/page.tsx)
- [src/app/admin/dashboard/usuarios/page.tsx](/Users/lucasvillela/Desktop/FULL%20CRM/AGENDAMENTOS/fullhouse-reservas/src/app/admin/dashboard/usuarios/page.tsx)
- [src/app/admin/dashboard/estabelecimentos/page.tsx](/Users/lucasvillela/Desktop/FULL%20CRM/AGENDAMENTOS/fullhouse-reservas/src/app/admin/dashboard/estabelecimentos/page.tsx)
- [src/app/admin/dashboard/personalizacao/page.tsx](/Users/lucasvillela/Desktop/FULL%20CRM/AGENDAMENTOS/fullhouse-reservas/src/app/admin/dashboard/personalizacao/page.tsx)
- [src/components/admin/AdminSidebar.tsx](/Users/lucasvillela/Desktop/FULL%20CRM/AGENDAMENTOS/fullhouse-reservas/src/components/admin/AdminSidebar.tsx)
- [src/components/admin/AdminLoginClient.tsx](/Users/lucasvillela/Desktop/FULL%20CRM/AGENDAMENTOS/fullhouse-reservas/src/components/admin/AdminLoginClient.tsx)

### 5. Painel administrativo por estabelecimento

Responsável pela gestão operacional de cada unidade.

Inclui:

- reservas
- painel operacional
- relatórios
- horários
- regras
- bloqueios
- ambientes
- webhooks
- follow-ups
- usuários por unidade

Rotas principais:

- `/admin/unidades/[unitId]/reservas`
- `/admin/unidades/[unitId]/painel`
- `/admin/unidades/[unitId]/relatorios`
- `/admin/unidades/[unitId]/configuracoes/horarios`
- `/admin/unidades/[unitId]/configuracoes/regras`
- `/admin/unidades/[unitId]/configuracoes/bloqueios`
- `/admin/unidades/[unitId]/configuracoes/ambientes`
- `/admin/unidades/[unitId]/webhooks`
- `/admin/unidades/[unitId]/followups`
- `/admin/unidades/[unitId]/usuarios`

### 6. APIs e automações

Responsáveis por conectar a interface com o banco e com integrações.

APIs principais:

- reserva e busca de reservas
- edição da reserva do cliente
- checagem semanal por telefone
- criação e edição de usuários admin
- criação e edição de estabelecimentos
- personalização da marca
- teste e cadastro de push
- teste de webhook
- geração de follow-ups
- assistente conversacional
- verificação de disponibilidade

Arquivos principais:

- [src/app/api/reservations/route.ts](/Users/lucasvillela/Desktop/FULL%20CRM/AGENDAMENTOS/fullhouse-reservas/src/app/api/reservations/route.ts)
- [src/app/api/client-reservation/route.ts](/Users/lucasvillela/Desktop/FULL%20CRM/AGENDAMENTOS/fullhouse-reservas/src/app/api/client-reservation/route.ts)
- [src/app/api/reservations/weekly-check/route.ts](/Users/lucasvillela/Desktop/FULL%20CRM/AGENDAMENTOS/fullhouse-reservas/src/app/api/reservations/weekly-check/route.ts)
- [src/app/api/availability/check/route.ts](/Users/lucasvillela/Desktop/FULL%20CRM/AGENDAMENTOS/fullhouse-reservas/src/app/api/availability/check/route.ts)
- [src/app/api/conversation/assist/route.ts](/Users/lucasvillela/Desktop/FULL%20CRM/AGENDAMENTOS/fullhouse-reservas/src/app/api/conversation/assist/route.ts)
- [src/app/api/followups/generate/route.ts](/Users/lucasvillela/Desktop/FULL%20CRM/AGENDAMENTOS/fullhouse-reservas/src/app/api/followups/generate/route.ts)
- [src/app/api/push/subscribe/route.ts](/Users/lucasvillela/Desktop/FULL%20CRM/AGENDAMENTOS/fullhouse-reservas/src/app/api/push/subscribe/route.ts)
- [src/app/api/push/test/route.ts](/Users/lucasvillela/Desktop/FULL%20CRM/AGENDAMENTOS/fullhouse-reservas/src/app/api/push/test/route.ts)
- [src/app/api/webhooks/test/route.ts](/Users/lucasvillela/Desktop/FULL%20CRM/AGENDAMENTOS/fullhouse-reservas/src/app/api/webhooks/test/route.ts)

### 7. Camada de regras de negócio

Responsável pela inteligência do sistema.

Inclui:

- validação de reservas
- disponibilidade
- regras por estabelecimento
- bloqueios de data
- capacidade por ambiente
- prevenção de overbooking
- envio de notificações
- geração de mensagens contextuais

Arquivos principais:

- [src/lib/reservation-validation.ts](/Users/lucasvillela/Desktop/FULL%20CRM/AGENDAMENTOS/fullhouse-reservas/src/lib/reservation-validation.ts)
- [src/lib/availability-check.ts](/Users/lucasvillela/Desktop/FULL%20CRM/AGENDAMENTOS/fullhouse-reservas/src/lib/availability-check.ts)
- [src/lib/conversation-assistant.ts](/Users/lucasvillela/Desktop/FULL%20CRM/AGENDAMENTOS/fullhouse-reservas/src/lib/conversation-assistant.ts)
- [src/lib/follow-up-generator.ts](/Users/lucasvillela/Desktop/FULL%20CRM/AGENDAMENTOS/fullhouse-reservas/src/lib/follow-up-generator.ts)
- [src/lib/push.ts](/Users/lucasvillela/Desktop/FULL%20CRM/AGENDAMENTOS/fullhouse-reservas/src/lib/push.ts)
- [src/lib/platform.ts](/Users/lucasvillela/Desktop/FULL%20CRM/AGENDAMENTOS/fullhouse-reservas/src/lib/platform.ts)
- [src/lib/admin-auth.ts](/Users/lucasvillela/Desktop/FULL%20CRM/AGENDAMENTOS/fullhouse-reservas/src/lib/admin-auth.ts)

### 8. Banco de dados

Responsável pela persistência do sistema.

Estrutura principal:

- `units`
- `business_settings`
- `admin_users`
- `customers`
- `reservations`
- `reservation_rules`
- `time_slots`
- `date_blocks`
- `environments`
- `webhooks`
- `webhook_logs`
- `follow_up_rules`
- `reminder_logs`
- `push_subscriptions`

Migrations:

- [001_initial_schema.sql](/Users/lucasvillela/Desktop/FULL%20CRM/AGENDAMENTOS/fullhouse-reservas/supabase/migrations/001_initial_schema.sql)
- [002_users_and_push.sql](/Users/lucasvillela/Desktop/FULL%20CRM/AGENDAMENTOS/fullhouse-reservas/supabase/migrations/002_users_and_push.sql)
- [003_environments_update.sql](/Users/lucasvillela/Desktop/FULL%20CRM/AGENDAMENTOS/fullhouse-reservas/supabase/migrations/003_environments_update.sql)
- [004_reservation_guards.sql](/Users/lucasvillela/Desktop/FULL%20CRM/AGENDAMENTOS/fullhouse-reservas/supabase/migrations/004_reservation_guards.sql)
- [005_business_settings.sql](/Users/lucasvillela/Desktop/FULL%20CRM/AGENDAMENTOS/fullhouse-reservas/supabase/migrations/005_business_settings.sql)

## Recursos principais

### Gestão de marca

- nome da marca
- nome curto
- tagline
- descrição pública
- logo
- cor principal
- cor secundária
- prefixo do código da reserva

### Gestão de estabelecimentos

- múltiplos estabelecimentos no mesmo sistema
- ativação e desativação de unidades
- slug público por unidade
- endereço, telefone e imagem

### Motor de reservas

- criação de reservas online
- confirmação com código exclusivo
- consulta por código
- edição da reserva pelo cliente
- validação de regras de negócio

### Regras operacionais

- mínimo de pessoas
- máximo de pessoas
- antecedência mínima
- antecedência máxima
- tolerância
- bloqueios por data
- controle de horários
- controle por ambiente

### Administração

- dashboard geral
- métricas e relatórios
- usuários administrativos
- controle por papel
- operação por unidade
- mobile responsivo

### Notificações e integrações

- push notification no admin
- teste manual de push
- webhooks com assinatura
- logs de webhook
- estrutura pronta para CRM

### Assistência comercial

- checagem automática de disponibilidade
- reenvio de link de reserva
- geração de follow-ups
- base para conversas mais contextuais

## Funções de negócio do sistema

### Funções voltadas ao cliente final

- escolher estabelecimento
- escolher data e horário
- informar quantidade de pessoas
- concluir reserva
- receber código de confirmação
- consultar a própria reserva
- editar a reserva com o código

### Funções voltadas ao gestor

- personalizar a marca
- cadastrar novos estabelecimentos
- configurar horários
- configurar regras
- configurar ambientes
- bloquear datas
- acompanhar reservas
- gerenciar equipe administrativa
- habilitar push
- testar webhooks

### Funções voltadas à operação

- impedir reservas fora da regra
- validar lotação
- reduzir risco de overbooking
- centralizar dados no admin
- apoiar automações de CRM

## Fluxo principal do produto

### Fluxo 1. Instalação

1. O cliente cria o próprio Supabase.
2. O cliente cria a própria Vercel.
3. O cliente sobe o projeto no próprio GitHub.
4. O cliente roda o setup inicial.
5. O cliente cria a própria marca e o primeiro estabelecimento.

### Fluxo 2. Operação

1. O cliente publica a página pública.
2. O consumidor entra no estabelecimento desejado.
3. O consumidor faz a reserva.
4. O sistema valida as regras.
5. O admin acompanha tudo no painel.

### Fluxo 3. Expansão

1. O cliente adiciona novas unidades.
2. Configura horários e regras de cada unidade.
3. Centraliza a operação no mesmo painel.

## O que o cliente consegue configurar sem código

- identidade visual
- dados de contato
- logo
- estabelecimentos
- horários
- regras
- ambientes
- bloqueios
- usuários administrativos
- push notifications
- webhooks

## Valor percebido para o cliente

Esse sistema não é só uma página de reservas.

Ele entrega:

- organização da operação
- redução de erros humanos
- experiência de marca mais profissional
- estrutura para expansão em múltiplas unidades
- base para CRM, atendimento e automações
- independência tecnológica, porque o sistema roda no ambiente do próprio cliente

## Material complementar

- instalação técnica: [docs/INSTALACAO.md](/Users/lucasvillela/Desktop/FULL%20CRM/AGENDAMENTOS/fullhouse-reservas/docs/INSTALACAO.md)
- lista técnica de recursos: [docs/RECURSOS.md](/Users/lucasvillela/Desktop/FULL%20CRM/AGENDAMENTOS/fullhouse-reservas/docs/RECURSOS.md)

## Resumo executivo

O projeto é uma plataforma de reservas whitelabel, multiestabelecimento, com branding próprio, painel administrativo responsivo, validações operacionais, notificações, integrações e estrutura pronta para crescer com o negócio do cliente.
