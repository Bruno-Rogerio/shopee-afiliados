import type { Product } from "@/lib/types";

export function getProductImages(product: Product) {
  const fromArray = (product.image_urls ?? []).filter(Boolean);
  const fallback = product.image_url ? [product.image_url] : [];
  const merged = [...fromArray, ...fallback];
  const unique = Array.from(new Set(merged));
  return unique;
}
