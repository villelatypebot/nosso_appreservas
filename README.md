# Reservas Whitelabel

Sistema de reservas whitelabel em `Next.js + Supabase`, pronto para ser instalado por qualquer cliente com a própria marca, os próprios estabelecimentos e o próprio ambiente na Vercel.

## O que já vem pronto

- setup inicial em `/setup` para cadastrar marca, primeiro administrador e primeiro estabelecimento
- personalização de nome, logo, cores, descrição pública e prefixo do código da reserva
- cadastro de múltiplos estabelecimentos
- páginas públicas de reserva por estabelecimento
- painel administrativo responsivo para desktop e mobile
- regras de reserva, ambientes, horários, bloqueios e relatórios
- push notifications para administradores
- webhooks e utilitários de integração
- endpoints para assistente conversacional e gerador de follow-up
- proteção de reserva com validação server-side e base pronta para anti-overbooking via SQL

## Stack

- `Next.js 16`
- `React 19`
- `Supabase` para auth, banco e storage lógico da aplicação
- `Vercel` para deploy
- `web-push` para notificações

## Instalação rápida

1. Copie `.env.example` para `.env.local`.
2. Crie um projeto no Supabase.
3. Rode os arquivos SQL em `supabase/migrations` na ordem `001` até `005`.
4. Preencha as chaves do Supabase no `.env.local`.
5. Rode `npm install`.
6. Rode `npm run dev`.
7. Abra [http://localhost:3000/setup](http://localhost:3000/setup).
8. Conclua o setup inicial da marca e do primeiro estabelecimento.

Guia completo: [docs/INSTALACAO.md](/Users/lucasvillela/Desktop/FULL%20CRM/AGENDAMENTOS/fullhouse-reservas/docs/INSTALACAO.md)  
Lista completa de recursos: [docs/RECURSOS.md](/Users/lucasvillela/Desktop/FULL%20CRM/AGENDAMENTOS/fullhouse-reservas/docs/RECURSOS.md)

## Scripts úteis

```bash
npm run dev
npm run lint
npx tsc --noEmit
npm run smoke:test
```

O `smoke:test` procura automaticamente o primeiro estabelecimento ativo com horários configurados e valida o fluxo principal de reserva.

## Estrutura de instalação recomendada

- desenvolvimento local: `.env.local`
- produção: variáveis na Vercel
- setup inicial: `/setup`
- operação diária: `/admin/login`

## Documentação oficial recomendada

- Supabase Next.js Quickstart: [supabase.com/docs/guides/getting-started/quickstarts/nextjs](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs)
- Supabase API Keys: [supabase.com/docs/guides/api/api-keys](https://supabase.com/docs/guides/api/api-keys)
- Vercel Environment Variables: [vercel.com/docs/environment-variables](https://vercel.com/docs/environment-variables)
- Vercel com GitHub: [vercel.com/docs/git/vercel-for-github](https://vercel.com/docs/git/vercel-for-github)

## Observações importantes

- o projeto não semeia mais unidades demo; o primeiro estabelecimento nasce no setup
- o setup inicial pode ser desligado depois com `NEXT_PUBLIC_SETUP_ENABLED=false`
- o acesso livre ao admin também pode ser controlado por `NEXT_PUBLIC_ADMIN_ALLOW_FREE_ACCESS`
- para proteção atômica contra overbooking simultâneo, mantenha a migration `004_reservation_guards.sql` aplicada
