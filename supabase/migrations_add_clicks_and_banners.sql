ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS click_count integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS products_click_count_idx
  ON public.products (click_count);

CREATE TABLE IF NOT EXISTS public.home_banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  subtitle text,
  badge text,
  cta_label text,
  cta_url text,
  theme text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS home_banners_is_active_idx
  ON public.home_banners (is_active);

CREATE INDEX IF NOT EXISTS home_banners_sort_order_idx
  ON public.home_banners (sort_order);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_home_banners_updated_at ON public.home_banners;
CREATE TRIGGER set_home_banners_updated_at
BEFORE UPDATE ON public.home_banners
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.increment_product_clicks()
RETURNS trigger AS $$
BEGIN
  UPDATE public.products
  SET click_count = coalesce(click_count, 0) + 1
  WHERE id = NEW.product_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS increment_product_clicks ON public.outbound_clicks;
CREATE TRIGGER increment_product_clicks
AFTER INSERT ON public.outbound_clicks
FOR EACH ROW EXECUTE FUNCTION public.increment_product_clicks();

ALTER TABLE public.home_banners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read active home banners" ON public.home_banners;
CREATE POLICY "Public read active home banners"
ON public.home_banners FOR SELECT
USING (is_active = true);

DROP POLICY IF EXISTS "Authenticated read home banners" ON public.home_banners;
CREATE POLICY "Authenticated read home banners"
ON public.home_banners FOR SELECT
USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated insert home banners" ON public.home_banners;
CREATE POLICY "Authenticated insert home banners"
ON public.home_banners FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated update home banners" ON public.home_banners;
CREATE POLICY "Authenticated update home banners"
ON public.home_banners FOR UPDATE
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated delete home banners" ON public.home_banners;
CREATE POLICY "Authenticated delete home banners"
ON public.home_banners FOR DELETE
USING (auth.role() = 'authenticated');
