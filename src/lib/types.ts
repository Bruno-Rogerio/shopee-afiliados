export type Product = {
  id: string;
  slug: string;
  external_id: string | null;
  title: string;
  description_short: string | null;
  price_text: string | null;
  image_url: string | null;
  origin_url: string;
  affiliate_url: string | null;
  tags: string[] | null;
  store_name: string | null;
  category: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
};

export type CopyVariant = {
  variant: string;
  content: string;
};
