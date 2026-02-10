insert into public.products (
  slug,
  title,
  description_short,
  price_text,
  image_url,
  image_urls,
  origin_url,
  affiliate_url,
  tags,
  is_featured,
  is_exclusive,
  is_trending,
  is_hot,
  featured_rank,
  exclusive_rank,
  trending_rank,
  hot_rank,
  is_active,
  store_name,
  category
)
values
  (
    'fone-bluetooth-lite',
    'Fone Bluetooth Lite',
    'Som limpo e bateria que dura o dia inteiro.',
    'R$ 79,90',
    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e',
    array['https://images.unsplash.com/photo-1505740420928-5e560c06d30e'],
    'https://example.com/produtos/fone-bluetooth-lite',
    null,
    array['audio', 'achados'],
    true,
    false,
    true,
    false,
    1,
    null,
    2,
    null,
    true,
    'Loja Central',
    'Acessórios'
  ),
  (
    'smartwatch-fit-go',
    'Smartwatch Fit Go',
    'Monitoramento de passos e notificações no pulso.',
    'R$ 129,00',
    'https://images.unsplash.com/photo-1523275335684-37898b6baf30',
    array['https://images.unsplash.com/photo-1523275335684-37898b6baf30'],
    'https://example.com/produtos/smartwatch-fit-go',
    null,
    array['fitness', 'tech'],
    true,
    true,
    true,
    true,
    2,
    1,
    1,
    1,
    true,
    'Fit Store',
    'Wearables'
  ),
  (
    'lampada-led-eco',
    'Lâmpada LED Eco 12W',
    'Mais economia e luz confortável para a casa.',
    'R$ 14,90',
    'https://images.unsplash.com/photo-1507473885765-e6ed057f782c',
    array['https://images.unsplash.com/photo-1507473885765-e6ed057f782c'],
    'https://example.com/produtos/lampada-led-eco',
    null,
    array['casa'],
    false,
    false,
    true,
    true,
    null,
    null,
    3,
    2,
    true,
    'Casa Viva',
    'Casa'
  );

insert into public.collections (name, slug, description, is_active)
values
  (
    'Achados Tech',
    'achados-tech',
    'Gadgets e eletrônicos em destaque para conversão rápida.',
    true
  ),
  (
    'Casa e Conforto',
    'casa-e-conforto',
    'Itens essenciais para renovar a casa com economia.',
    true
  );

insert into public.collection_items (collection_id, product_id, sort_order)
values
  (
    (select id from public.collections where slug = 'achados-tech'),
    (select id from public.products where slug = 'fone-bluetooth-lite'),
    1
  ),
  (
    (select id from public.collections where slug = 'achados-tech'),
    (select id from public.products where slug = 'smartwatch-fit-go'),
    2
  ),
  (
    (select id from public.collections where slug = 'casa-e-conforto'),
    (select id from public.products where slug = 'lampada-led-eco'),
    1
  );

insert into public.home_banners (
  title,
  subtitle,
  badge,
  cta_label,
  cta_url,
  theme,
  sort_order,
  is_active
)
values
  (
    'Super descontos do dia',
    'Seleção com preços reduzidos para você economizar agora.',
    'HOJE',
    'Ver ofertas',
    '/#ofertas',
    'amber',
    1,
    true
  ),
  (
    'Listas especiais',
    'Coleções prontas para encontrar rápido o que você procura.',
    'TOP',
    'Explorar listas',
    '/listas',
    'indigo',
    2,
    true
  ),
  (
    'Categorias em alta',
    'Acesse as categorias mais procuradas da semana.',
    'HOT',
    'Ver categorias',
    '/c',
    'emerald',
    3,
    true
  );
