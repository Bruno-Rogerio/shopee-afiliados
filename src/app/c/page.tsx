import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/slugify";
import type { Product } from "@/lib/types";

export const revalidate = 60;

type CategorySummary = {
  name: string;
  slug: string;
  count: number;
};

function buildCategories(products: Product[]): CategorySummary[] {
  const map = new Map<string, CategorySummary>();

  products.forEach((product) => {
    const name = product.category?.trim();
    if (!name) return;
    const slug = slugify(name);
    if (!slug) return;

    const existing = map.get(slug);
    if (existing) {
      existing.count += 1;
    } else {
      map.set(slug, { name, slug, count: 1 });
    }
  });

  return Array.from(map.values()).sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return a.name.localeCompare(b.name);
  });
}

export default async function CategoriesPage() {
  const supabase = createServerClient();
  const { data } = supabase
    ? await supabase
        .from("products")
        .select("id, category, is_active")
        .eq("is_active", true)
    : { data: [] };

  const products = (data ?? []) as Product[];
  const categories = buildCategories(products);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 px-6 py-10">
      <div className="mx-auto w-full max-w-5xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link
              href="/"
              className="text-sm text-slate-500 transition hover:text-slate-700"
            >
              Voltar para a vitrine
            </Link>
            <h1 className="mt-3 text-3xl font-semibold text-slate-900">
              Todas as categorias
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              {categories.length} categorias com ofertas ativas.
            </p>
          </div>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.length === 0 ? (
            <div className="col-span-full rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">
              Nenhuma categoria encontrada ainda.
            </div>
          ) : (
            categories.map((category) => (
              <Link
                key={category.slug}
                href={`/c/${category.slug}`}
                className="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
              >
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                  Categoria
                </p>
                <h2 className="mt-2 text-xl font-semibold text-slate-900">
                  {category.name}
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  {category.count} ofertas
                </p>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
