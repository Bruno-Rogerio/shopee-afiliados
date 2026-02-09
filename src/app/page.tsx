import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import { ProductCard } from "@/components/ProductCard";
import type { Product } from "@/lib/types";

export const revalidate = 60;

export default async function Home() {
  const supabase = createServerClient();
  const { data } = supabase
    ? await supabase
        .from("products")
        .select(
          "id, slug, title, description_short, price_text, image_url, tags, is_active"
        )
        .eq("is_active", true)
        .order("created_at", { ascending: false })
    : { data: [] };

  const products = (data ?? []) as Product[];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <header className="border-b border-white/60 bg-white/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-6">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
              Catálogo de Afiliados
            </p>
            <h1 className="text-2xl font-semibold text-slate-900">
              Vitrine de Ofertas
            </h1>
          </div>
          <Link
            href="/admin"
            className="rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
          >
            Painel admin
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-6 py-10">
        <section className="rounded-3xl border border-white/80 bg-white/70 p-8 shadow-sm backdrop-blur">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <h2 className="text-3xl font-semibold text-slate-900">
                Achados selecionados para compartilhar
              </h2>
              <p className="mt-3 max-w-2xl text-sm text-slate-600">
                Produtos com preço em destaque e link direto para comprar.
                Atualizamos a vitrine todos os dias.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-500">
              Compartilhe com seu público e acompanhe os cliques.
            </div>
          </div>
        </section>

        <section className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {products.length === 0 ? (
            <div className="col-span-full rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">
              Nenhum produto publicado ainda. Volte em breve.
            </div>
          ) : (
            products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))
          )}
        </section>
      </main>
    </div>
  );
}
