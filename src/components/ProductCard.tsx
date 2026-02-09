import Link from "next/link";
import { Product } from "@/lib/types";

type ProductCardProps = {
  product: Product;
};

export function ProductCard({ product }: ProductCardProps) {
  const tags = product.tags ?? [];

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/70 shadow-sm backdrop-blur transition hover:-translate-y-1 hover:shadow-lg">
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100">
        {product.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.image_url}
            alt={product.title}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-slate-400">
            Sem imagem
          </div>
        )}
      </div>
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
          <div className="text-base font-semibold text-slate-900">
            {product.price_text || "Consulte o preço"}
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
