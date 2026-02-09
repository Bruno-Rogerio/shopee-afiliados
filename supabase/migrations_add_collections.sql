ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS featured_rank integer;

ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS exclusive_rank integer;

ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS trending_rank integer;

ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS hot_rank integer;

CREATE TABLE IF NOT EXISTS public.collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.collections
ADD COLUMN IF NOT EXISTS description text;

ALTER TABLE public.collections
ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

ALTER TABLE public.collections
ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.collections
ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE TABLE IF NOT EXISTS public.collection_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id uuid NOT NULL REFERENCES public.collections (id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products (id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.collection_items
ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

ALTER TABLE public.collection_items
ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

CREATE UNIQUE INDEX IF NOT EXISTS collection_items_unique_idx
  ON public.collection_items (collection_id, product_id);

CREATE INDEX IF NOT EXISTS collections_is_active_idx
  ON public.collections (is_active);

CREATE INDEX IF NOT EXISTS collection_items_collection_id_idx
  ON public.collection_items (collection_id);

CREATE INDEX IF NOT EXISTS collection_items_product_id_idx
  ON public.collection_items (product_id);

CREATE INDEX IF NOT EXISTS products_featured_rank_idx
  ON public.products (featured_rank);

CREATE INDEX IF NOT EXISTS products_exclusive_rank_idx
  ON public.products (exclusive_rank);

CREATE INDEX IF NOT EXISTS products_trending_rank_idx
  ON public.products (trending_rank);

CREATE INDEX IF NOT EXISTS products_hot_rank_idx
  ON public.products (hot_rank);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_collections_updated_at ON public.collections;
CREATE TRIGGER set_collections_updated_at
BEFORE UPDATE ON public.collections
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read active collections" ON public.collections;
CREATE POLICY "Public read active collections"
ON public.collections FOR SELECT
USING (is_active = true);

DROP POLICY IF EXISTS "Authenticated read collections" ON public.collections;
CREATE POLICY "Authenticated read collections"
ON public.collections FOR SELECT
USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated insert collections" ON public.collections;
CREATE POLICY "Authenticated insert collections"
ON public.collections FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated update collections" ON public.collections;
CREATE POLICY "Authenticated update collections"
ON public.collections FOR UPDATE
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated delete collections" ON public.collections;
CREATE POLICY "Authenticated delete collections"
ON public.collections FOR DELETE
USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Public read collection items" ON public.collection_items;
CREATE POLICY "Public read collection items"
ON public.collection_items FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.collections c
    WHERE c.id = collection_id
      AND c.is_active = true
  )
);

DROP POLICY IF EXISTS "Authenticated read collection items" ON public.collection_items;
CREATE POLICY "Authenticated read collection items"
ON public.collection_items FOR SELECT
USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated insert collection items" ON public.collection_items;
CREATE POLICY "Authenticated insert collection items"
ON public.collection_items FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated update collection items" ON public.collection_items;
CREATE POLICY "Authenticated update collection items"
ON public.collection_items FOR UPDATE
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated delete collection items" ON public.collection_items;
CREATE POLICY "Authenticated delete collection items"
ON public.collection_items FOR DELETE
USING (auth.role() = 'authenticated');
