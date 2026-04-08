# Instalação Whitelabel

Este projeto foi preparado para o seu cliente instalar sozinho no próprio Supabase e na própria Vercel.

## 1. Pré-requisitos

- conta no GitHub
- conta na Vercel
- conta no Supabase
- Node.js `20+`
- acesso para criar variáveis de ambiente

## 2. Clonar e instalar

```bash
git clone https://github.com/SEU-USUARIO/SEU-REPOSITORIO.git
cd fullhouse-reservas
npm install
cp .env.example .env.local
```

## 3. Criar o projeto no Supabase

1. Crie um novo projeto no Supabase.
2. Copie:
   - `Project URL`
   - `anon key`
   - `service_role key`
3. Abra o SQL Editor do projeto.
4. Rode os arquivos abaixo nesta ordem:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_users_and_push.sql`
   - `supabase/migrations/003_environments_update.sql`
   - `supabase/migrations/004_reservation_guards.sql`
   - `supabase/migrations/005_business_settings.sql`

## 4. Configurar variáveis locais

Preencha o `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SETUP_ENABLED=true
NEXT_PUBLIC_ADMIN_ALLOW_FREE_ACCESS=false
NEXT_PUBLIC_BRAND_NAME=Minha Marca
NEXT_PUBLIC_BRAND_SHORT_NAME=Minha Marca
NEXT_PUBLIC_BRAND_TAGLINE=Sistema de reservas profissional e replicável
NEXT_PUBLIC_BRAND_DESCRIPTION=Gerencie reservas, unidades e integrações.
NEXT_PUBLIC_BRAND_PRIMARY_COLOR=#F47920
NEXT_PUBLIC_BRAND_SECONDARY_COLOR=#C45E0A
NEXT_PUBLIC_RESERVATION_CODE_PREFIX=RS
```

## 5. Rodar localmente

```bash
npm run dev
```

Abra [http://localhost:3000/setup](http://localhost:3000/setup).

## 6. Concluir o setup inicial

Na tela `/setup`, o cliente preenche:

- nome da marca
- nome curto
- tagline
- descrição pública
- telefone, e-mail e WhatsApp
- URL da logo
- cor principal e cor secundária
- prefixo do código da reserva
- nome, e-mail e senha do administrador principal
- nome, slug, endereço e telefone do primeiro estabelecimento

Ao concluir:

- o primeiro usuário admin é criado no Supabase Auth
- a marca é salva em `business_settings`
- o primeiro estabelecimento é salvo em `units`
- regras e ambiente padrão são criados automaticamente

## 7. Configurar o primeiro estabelecimento

Depois do setup, entre em `/admin/login` e configure:

1. `Horários`
2. `Regras`
3. `Ambientes`
4. `Bloqueios`
5. `Webhooks`, se for integrar com CRM
6. `Notificações push`, se quiser alertas no admin

Sem horários ativos, o estabelecimento existe mas não conseguirá receber reservas válidas.

## 8. Configurar a personalização depois do setup

O cliente pode alterar a marca a qualquer momento em:

- `/admin/dashboard/personalizacao`

Lá ele ajusta:

- nome da marca
- nome curto
- logo
- cores
- contatos
- descrição
- prefixo do código da reserva

Isso já reflete em:

- home pública
- tela de login do admin
- menu lateral
- manifesto PWA
- ícone do app
- códigos de reserva novos

## 9. Configurar novos estabelecimentos

O cliente pode criar outros estabelecimentos em:

- `/admin/dashboard/estabelecimentos`

Cada estabelecimento nasce com:

- ambiente padrão
- regras padrão

Depois disso, basta entrar nas configurações da unidade e ajustar horários, regras e bloqueios.

## 10. Configurar push notifications

As notificações push são opcionais, mas recomendadas.

Gere as chaves VAPID:

```bash
npx web-push generate-vapid-keys
```

Adicione no `.env.local` e na Vercel:

```env
NEXT_PUBLIC_VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:contato@suaempresa.com.br
```

Depois:

1. abra o admin no navegador ou PWA
2. ative `Notificações ON`
3. use o botão `Testar push`

## 11. Publicar na Vercel

1. Suba o repositório no GitHub.
2. Importe o projeto na Vercel.
3. Adicione todas as mesmas variáveis de ambiente do `.env.local`.
4. Defina `NEXT_PUBLIC_APP_URL` com a URL oficial do projeto.
5. Faça o deploy.

Depois do primeiro deploy:

- abra `/setup` se ainda não concluiu o onboarding
- ou `/admin/login` se o setup já foi feito

## 12. Checklist de go-live

- `NEXT_PUBLIC_SETUP_ENABLED=false` depois da instalação inicial
- `NEXT_PUBLIC_ADMIN_ALLOW_FREE_ACCESS=false`
- migrations `001` a `005` aplicadas
- pelo menos um estabelecimento ativo
- horários ativos cadastrados
- push configurado, se desejar
- smoke test rodado

## 13. Smoke test

Com o app local rodando, execute:

```bash
npm run smoke:test
```

Esse teste valida:

- disponibilidade
- assistente conversacional
- criação de reserva
- bloqueio semanal
- consulta por código
- edição da reserva
- busca no admin

Se quiser apontar para um ambiente específico:

```bash
SMOKE_TEST_BASE_URL=http://localhost:3000 npm run smoke:test
```

## 14. Links oficiais úteis

- Supabase Next.js Quickstart: [https://supabase.com/docs/guides/getting-started/quickstarts/nextjs](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs)
- Supabase API Keys: [https://supabase.com/docs/guides/api/api-keys](https://supabase.com/docs/guides/api/api-keys)
- Vercel Environment Variables: [https://vercel.com/docs/environment-variables](https://vercel.com/docs/environment-variables)
- Vercel GitHub Deploy: [https://vercel.com/docs/git/vercel-for-github](https://vercel.com/docs/git/vercel-for-github)
