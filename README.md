# Catálogo de Afiliados (MVP)

MVP simples para publicar produtos em vitrine pública, gerar copys para WhatsApp e registrar cliques de saída.

## Stack
- Next.js (App Router) + React + TypeScript
- Supabase (Auth, Postgres, RLS)

## Setup local
1. Instale dependências:
   - `npm install`
2. Copie o arquivo `.env.local.example` para `.env.local` e preencha:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. No Supabase SQL editor, execute:
   - `supabase/schema.sql`
   - `supabase/seed.sql` (opcional)
4. Crie um usuário em Supabase Auth (Email/Password).
5. Rode o projeto:
   - `npm run dev`

## Como publicar um produto
1. Acesse `/admin` e faça login.
2. Preencha o formulário com título, links e (opcional) imagem/tags.
3. Marque "Publicar agora" e salve.

## Gerar copys
1. Acesse `/admin/copys`.
2. Selecione um produto e clique em "Gerar copys".
3. Use o botão "Copiar" para cada variação.

## Importar CSV da Shopee
1. Acesse `/admin/import`.
2. Faça upload do CSV exportado da Shopee.
3. Clique em "Importar" e confira o resumo.

Formato esperado (com BOM e cabeçalho):
```
Item Id, Item Name, Price, Sales, Shop Name, Commission Rate, Commission, Product Link, Offer Link
```

Importação:
- Cria produtos como rascunho (`is_active=false`) com `tags=["shopee"]`.
- Evita duplicados por `external_id`.
- Se já existir, atualiza somente `price_text`, `origin_url`, `affiliate_url`.
- Após importar, complete imagem e categoria no painel.

## Tracking /out
- `/out/[slug]` registra clique em `outbound_clicks` e redireciona.
- Usa `affiliate_url` se existir; caso contrário, usa `origin_url`.

## Pronto para Shopee API
O arquivo `src/lib/linkResolver.ts` centraliza a regra de URL:
```ts
resolveProductUrl(product)
```
No futuro, basta trocar a implementação para gerar `affiliate_url` via API e salvar.
