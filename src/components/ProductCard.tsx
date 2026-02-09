import Link from "next/link";
import { ProductCarousel } from "@/components/ProductCarousel";
import { getProductImages } from "@/lib/images";
import { getOriginalPrice } from "@/lib/pricing";
import { Product } from "@/lib/types";

type ProductCardProps = {
  product: Product;
};

export function ProductCard({ product }: ProductCardProps) {
  const tags = product.tags ?? [];
  const images = getProductImages(product);
  const originalPrice = product.price_text
    ? getOriginalPrice(product.price_text, product.slug)
    : null;

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/70 shadow-sm backdrop-blur transition hover:-translate-y-1 hover:shadow-lg">
      <ProductCarousel images={images} />
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex flex-wrap gap-2 text-[11px] uppercase tracking-wide text-slate-500">
          {tags.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-slate-100 px-2.5 py-1"
            >
              {tag}
            </span>
          ))}
        </div>
        <div>
          <h3 className="text-lg font-semibold text-slate-900">
            {product.title}
          </h3>
          {product.description_short ? (
            <p className="mt-2 text-sm text-slate-600">
              {product.description_short}
            </p>
          ) : null}
        </div>
        <div className="mt-auto flex items-center justify-between">
          <div className="space-y-1">
            {originalPrice ? (
              <p className="text-xs text-slate-400 line-through">
                De {originalPrice}
              </p>
            ) : null}
            <div className="text-base font-semibold text-slate-900">
              {product.price_text
                ? `Por ${product.price_text}`
                : "Consulte o preco"}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/p/${product.slug}`}
            className="flex-1 rounded-full border border-slate-200 px-4 py-2 text-center text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
          >
            Ver detalhes
          </Link>
          <Link
            href={`/out/${product.slug}`}
            className="flex-1 rounded-full bg-slate-900 px-4 py-2 text-center text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Ir para oferta
          </Link>
        </div>
      </div>
    </article>
  );
}
