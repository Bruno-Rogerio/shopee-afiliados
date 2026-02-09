import Link from "next/link";
import { notFound } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/slugify";
import { ProductCard } from "@/components/ProductCard";
import type { Product } from "@/lib/types";

export const revalidate = 60;

type PageProps = {
  params: { slug: string };
};

export default async function CategoryPage({ params }: PageProps) {
  const supabase = createServerClient();
  const { data } = supabase
    ? await supabase
        .from("products")
        .select(
          "id, slug, title, description_short, price_text, image_url, image_urls, tags, category, is_featured, is_exclusive, is_trending, is_hot, featured_rank, exclusive_rank, trending_rank, hot_rank, is_active, created_at"
        )
        .eq("is_active", true)
        .order("created_at", { ascending: false })
    : { data: [] };

  const products = (data ?? []) as Product[];
  const filtered = products.filter((product) => {
    if (!product.category) return false;
    return slugify(product.category) === params.slug;
  });

  if (filtered.length === 0) {
    notFound();
  }

  const categoryName = filtered[0].category ?? "Categoria";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 px-6 py-10">
      <div className="mx-auto w-full max-w-5xl">
        <Link
          href="/c"
          className="text-sm text-slate-500 transition hover:text-slate-700"
        >
          Voltar para categorias
        </Link>
        <h1 className="mt-3 text-3xl font-semibold text-slate-900">
          {categoryName}
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          {filtered.length} ofertas selecionadas para esta categoria.
        </p>

        <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </div>
  );
}
