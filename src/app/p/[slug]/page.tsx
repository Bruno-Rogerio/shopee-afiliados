import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import { resolveProductUrl } from "@/lib/linkResolver";
import { getProductImages } from "@/lib/images";
import { getOriginalPrice } from "@/lib/pricing";
import { ProductCarousel } from "@/components/ProductCarousel";
import { slugify } from "@/lib/slugify";
import type { Product } from "@/lib/types";

export const revalidate = 60;

type PageProps = {
  params: { slug: string };
};

export default async function ProductPage({ params }: PageProps) {
  const slugParam = typeof params?.slug === "string" ? params.slug.trim() : "";
  const supabase = createServerClient();
  let productData: Product | null = null;

  if (supabase && slugParam) {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("slug", slugParam)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Product lookup failed:", error);
    }

    productData = (data ?? null) as Product | null;

    if (!productData) {
      const slugFallback = slugify(slugParam);
      if (slugFallback && slugFallback !== slugParam) {
        const { data: fallback } = await supabase
          .from("products")
          .select("*")
          .eq("slug", slugFallback)
          .eq("is_active", true)
          .limit(1)
          .maybeSingle();
        productData = (fallback ?? null) as Product | null;
      }
    }

    if (!productData) {
      const { data: fallback } = await supabase
        .from("products")
        .select("*")
        .ilike("slug", slugParam)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();
      productData = (fallback ?? null) as Product | null;
    }
  }

  if (!productData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 px-6 py-10">
        <div className="mx-auto w-full max-w-4xl">
          <Link
            href="/"
            className="text-sm text-slate-500 transition hover:text-slate-700"
          >
            Voltar para a vitrine
          </Link>
          <h1 className="mt-4 text-3xl font-semibold text-slate-900">
            Produto indisponivel
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            O produto nao foi encontrado ou ainda esta como rascunho.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/"
              className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Ver ofertas ativas
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const product = productData as Product;
  const images = getProductImages(product);
  const originalPrice = product.price_text
    ? getOriginalPrice(product.price_text, product.slug)
    : null;
  const directLink = resolveProductUrl({
    affiliate_url: product.affiliate_url,
    origin_url: product.origin_url,
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 px-6 py-10">
      <div className="mx-auto w-full max-w-4xl">
        <Link
          href="/"
          className="text-sm text-slate-500 transition hover:text-slate-700"
        >
          Voltar para a vitrine
        </Link>

        <div className="mt-6 overflow-hidden rounded-3xl border border-white/70 bg-white/80 shadow-lg backdrop-blur">
          <div className="grid gap-8 p-8 md:grid-cols-[1.1fr_1fr]">
            <div className="overflow-hidden rounded-2xl">
              <ProductCarousel images={images} />
            </div>

            <div className="flex flex-col justify-between gap-6">
              <div>
                <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                  {(product.tags ?? []).map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-slate-100 px-2.5 py-1"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <h1 className="mt-4 text-3xl font-semibold text-slate-900">
                  {product.title}
                </h1>
                <p className="mt-3 text-sm text-slate-600">
                  {product.description_short ||
                    "Um achado perfeito para compartilhar com seu público."}
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  {originalPrice ? (
                    <p className="text-xs text-slate-400 line-through">
                      De {originalPrice}
                    </p>
                  ) : null}
                  <div className="text-2xl font-semibold text-slate-900">
                    {product.price_text
                      ? `Por ${product.price_text}`
                      : "Consulte o preço"}
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  <a
                    href={`/out/${product.slug}`}
                    className="rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                    rel="nofollow"
                  >
                    Ir para oferta
                  </a>
                  <a
                    href={directLink}
                    className="rounded-full border border-slate-200 px-6 py-3 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                  >
                    Link direto
                  </a>
                </div>
                {product.store_name ? (
                  <p className="text-xs text-slate-500">
                    Loja: {product.store_name}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
