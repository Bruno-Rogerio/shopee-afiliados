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
    true,
    'Casa Viva',
    'Casa'
  );
