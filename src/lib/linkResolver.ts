type ProductLinkLike = {
  affiliate_url?: string | null;
  origin_url: string;
};

export function resolveProductUrl(product: ProductLinkLike) {
  return product.affiliate_url || product.origin_url;
}
