import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import { ProductCard } from "@/components/ProductCard";
import type { Collection, CollectionItem, Product } from "@/lib/types";

export const revalidate = 60;

type PageProps = {
  params: { slug: string };
};

export default async function CollectionPage({ params }: PageProps) {
  const slugParam = typeof params?.slug === "string" ? params.slug.trim() : "";
  const supabase = createServerClient();
  let collectionData: Collection | null = null;

  if (supabase && slugParam) {
    const { data, error } = await supabase
      .from("collections")
      .select("id, name, slug, description, is_active")
      .eq("slug", slugParam)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Collections lookup failed:", error);
    }

    collectionData = (data ?? null) as Collection | null;

    if (!collectionData) {
      const { data: fallback } = await supabase
        .from("collections")
        .select("id, name, slug, description, is_active")
        .ilike("slug", slugParam)
        .limit(1)
        .maybeSingle();
      collectionData = (fallback ?? null) as Collection | null;
    }
  }

  if (!collectionData || !collectionData.is_active) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 px-6 py-10">
        <div className="mx-auto w-full max-w-5xl">
          <Link
            href="/listas"
            className="text-sm text-slate-500 transition hover:text-slate-700"
          >
            Voltar para listas
          </Link>
          <h1 className="mt-4 text-3xl font-semibold text-slate-900">
            Lista indisponivel
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            A lista nao foi encontrada ou esta desativada. Para aparecer no
            site, ative a lista no painel admin.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/listas"
              className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Ver listas ativas
            </Link>
            <Link
              href="/"
              className="rounded-full border border-slate-200 bg-white px-5 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
            >
              Ir para home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const collection = collectionData as Collection;

  const { data: itemsData } = supabase
    ? await supabase
        .from("collection_items")
        .select(
          "id, sort_order, collection_id, product_id, product:products (id, slug, title, description_short, price_text, image_url, image_urls, tags, category, is_featured, is_exclusive, is_trending, is_hot, featured_rank, exclusive_rank, trending_rank, hot_rank, is_active, created_at)"
        )
        .eq("collection_id", collection.id)
        .order("sort_order", { ascending: true })
    : { data: [] };

  const items = (itemsData ?? []).map((item) => {
    const product = Array.isArray(item.product)
      ? item.product[0] ?? null
      : item.product ?? null;
    return { ...item, product };
  }) as (CollectionItem & { product: Product | null })[];
  const products = items
    .map((item) => item.product)
    .filter((product): product is Product => Boolean(product && product.is_active));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 px-6 py-10">
      <div className="mx-auto w-full max-w-5xl">
        <Link
          href="/listas"
          className="text-sm text-slate-500 transition hover:text-slate-700"
        >
          Voltar para listas
        </Link>
        <h1 className="mt-3 text-3xl font-semibold text-slate-900">
          {collection.name}
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          {collection.description ||
            "Seleção pronta para compartilhar com seu público."}
        </p>

        <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {products.length === 0 ? (
            <div className="col-span-full rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">
              Nenhum produto nesta lista ainda.
            </div>
          ) : (
            products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
