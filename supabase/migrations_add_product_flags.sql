ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false;

ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS is_exclusive boolean NOT NULL DEFAULT false;

ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS is_trending boolean NOT NULL DEFAULT false;

ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS is_hot boolean NOT NULL DEFAULT false;
