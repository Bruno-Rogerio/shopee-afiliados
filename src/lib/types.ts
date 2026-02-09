export type Product = {
  id: string;
  slug: string;
  external_id: string | null;
  title: string;
  description_short: string | null;
  price_text: string | null;
  image_url: string | null;
  image_urls: string[] | null;
  origin_url: string;
  affiliate_url: string | null;
  tags: string[] | null;
  store_name: string | null;
  category: string | null;
  is_featured: boolean;
  is_exclusive: boolean;
  is_trending: boolean;
  is_hot: boolean;
  featured_rank: number | null;
  exclusive_rank: number | null;
  trending_rank: number | null;
  hot_rank: number | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
};

export type CopyVariant = {
  variant: string;
  content: string;
};

export type Collection = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
};

export type CollectionItem = {
  id: string;
  collection_id: string;
  product_id: string;
  sort_order: number;
  product?: Product | null;
};
