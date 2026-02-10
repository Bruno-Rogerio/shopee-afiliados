# Catalogo de Afiliados (MVP)

MVP simples para publicar produtos em vitrine publica, gerar copys para WhatsApp e registrar cliques de saida.

## Stack
- Next.js (App Router) + React + TypeScript
- Supabase (Auth, Postgres, RLS, Storage)

## Setup local
1. Instale dependencias:
   - `npm install`
2. Copie o arquivo `.env.local.example` para `.env.local` e preencha:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_SITE_URL` (opcional, para gerar links absolutos nas copys)
   - `SUPABASE_SERVICE_ROLE_KEY` (server-only, para upload de imagens)
3. No Supabase SQL editor, execute:
   - `supabase/schema.sql`
   - `supabase/seed.sql` (opcional)
   - Se ja tinha a tabela criada, rode:
     - `supabase/migrations_add_image_urls.sql`
     - `supabase/migrations_add_product_flags.sql`
     - `supabase/migrations_add_collections.sql`
     - `supabase/migrations_add_clicks_and_banners.sql`
4. Crie um usuario em Supabase Auth (Email/Password).
5. Rode o projeto:
   - `npm run dev`

## Bucket de imagens (obrigatorio para uploads)
1. No Supabase Storage, crie o bucket `product-images`.
2. Marque o bucket como Public.
3. Garanta que `SUPABASE_SERVICE_ROLE_KEY` esteja no `.env.local` (nao exponha no client).

O painel permite adicionar imagens por link ou upload (via API server), criando um carrossel por produto.

## Como publicar um produto
1. Acesse `/admin` e faca login.
2. Preencha o formulario com titulo, links e (opcional) imagem/tags.
3. Defina a categoria, destaque/em alta, e a ordem se quiser priorizar na home.
4. Marque "Publicar agora" e salve.

Tambem e possivel selecionar varios produtos e clicar em "Publicar selecionados".

## Gerar copys
1. Acesse `/admin/copys`.
2. Selecione um produto e escolha o tipo de link:
   - Link com tracking (`/out`)
   - Link direto afiliado
3. Clique em "Gerar copys" e use o botao "Copiar".

Voce pode escolher canal (WhatsApp/Instagram/Stories), tom e urgencia.

## Banners da home
1. Acesse `/admin/banners`.
2. Crie banners com titulo, subtitulo e CTA.
3. Ordene com as setas para controlar a sequencia na home.

## Listas especiais
1. Acesse `/admin/collections`.
2. Crie uma lista com nome, slug e descricao.
3. Adicione produtos e ordene com as setas.
4. A lista aparece automaticamente na home e em `/listas/[slug]`.

## Categorias
- O campo `category` dos produtos alimenta as paginas `/c` e `/c/[slug]`.
- A home exibe as categorias com mais produtos.

## Importar CSV da Shopee
1. Acesse `/admin/import`.
2. Faca upload do CSV exportado da Shopee.
3. Clique em "Importar" e confira o resumo.

Formato esperado (com BOM e cabecalho):
```
Item Id, Item Name, Price, Sales, Shop Name, Commission Rate, Commission, Product Link, Offer Link
```

Importacao:
- Cria produtos como rascunho (`is_active=false`) com `tags=["shopee"]`.
- Evita duplicados por `external_id`.
- Se ja existir, atualiza somente `price_text`, `origin_url`, `affiliate_url`.
- A busca automatica de imagem e opcional (beta).
- Apos importar, complete imagem e categoria no painel.

## Tracking /out
- `/out/[slug]` registra clique em `outbound_clicks` e redireciona.
- Usa `affiliate_url` se existir; caso contrario, usa `origin_url`.
- O campo `click_count` e atualizado automaticamente a cada clique.

## Preco "De/Por"
- O "Por" usa o valor real do produto.
- O "De" e calculado automaticamente com um aumento fixo (5% a 25%) para simular desconto.

## Pronto para Shopee API
O arquivo `src/lib/linkResolver.ts` centraliza a regra de URL:
```ts
resolveProductUrl(product)
```
No futuro, basta trocar a implementacao para gerar `affiliate_url` via API e salvar.
