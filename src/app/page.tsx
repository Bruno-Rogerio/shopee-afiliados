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
          "id, slug, title, description_short, price_text, image_url, image_urls, tags, category, is_featured, is_exclusive, is_trending, is_hot, is_active"
        )
        .eq("is_active", true)
        .order("created_at", { ascending: false })
    : { data: [] };

  const products = (data ?? []) as Product[];
  const categories = Array.from(
    new Set(products.map((product) => product.category).filter(Boolean))
  ) as string[];
  const featured = products.filter((product) => product.is_featured);
  const exclusives = products.filter((product) => product.is_exclusive);
  const trending = products.filter((product) => product.is_trending);
  const hot = products.filter((product) => product.is_hot);
  const latest = products.slice(0, 9);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f4f4ff] via-white to-[#fef7f0]">
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
        <section className="relative overflow-hidden rounded-[36px] border border-white/80 bg-white/70 p-10 shadow-lg backdrop-blur">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-amber-200/30 blur-2xl" />
          <div className="absolute -bottom-16 left-10 h-48 w-48 rounded-full bg-indigo-200/40 blur-2xl" />
          <div className="relative z-10 flex flex-wrap items-start justify-between gap-6">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-slate-400">
                Seleção do dia
              </p>
              <h2 className="mt-2 text-4xl font-semibold text-slate-900">
                Achados quentes, exclusivos e com desconto de verdade
              </h2>
              <p className="mt-4 max-w-2xl text-sm text-slate-600">
                Monte sua vitrine com categorias, listas especiais e ofertas
                que convertem. Tudo pronto para compartilhar.
              </p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white px-5 py-4 text-xs text-slate-500 shadow-sm">
              Atualizado diariamente • Tracking ativo
            </div>
          </div>
        </section>

        {categories.length > 0 ? (
          <section className="mt-10">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h3 className="text-xl font-semibold text-slate-900">
                Categorias em destaque
              </h3>
              <p className="text-xs text-slate-500">
                Navegue por temas e listas especiais.
              </p>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {categories.map((category) => (
                <span
                  key={category}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs uppercase tracking-wide text-slate-600"
                >
                  {category}
                </span>
              ))}
            </div>
          </section>
        ) : null}

        {featured.length > 0 ? (
          <section className="mt-12">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h3 className="text-2xl font-semibold text-slate-900">
                Destaques da vitrine
              </h3>
              <p className="text-xs text-slate-500">
                Curadoria premium para compartilhar agora.
              </p>
            </div>
            <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {featured.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </section>
        ) : null}

        {exclusives.length > 0 ? (
          <section className="mt-12">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h3 className="text-2xl font-semibold text-slate-900">
                Listas exclusivas
              </h3>
              <p className="text-xs text-slate-500">
                Ofertas que você não encontra em qualquer lugar.
              </p>
            </div>
            <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {exclusives.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </section>
        ) : null}

        {trending.length > 0 ? (
          <section className="mt-12">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h3 className="text-2xl font-semibold text-slate-900">
                Em alta agora
              </h3>
              <p className="text-xs text-slate-500">
                Produtos mais comentados do momento.
              </p>
            </div>
            <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {trending.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </section>
        ) : null}

        {hot.length > 0 ? (
          <section className="mt-12">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h3 className="text-2xl font-semibold text-slate-900">
                Mais procurados
              </h3>
              <p className="text-xs text-slate-500">
                Os queridinhos que mais geram cliques.
              </p>
            </div>
            <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {hot.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </section>
        ) : null}

        <section className="mt-12">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h3 className="text-2xl font-semibold text-slate-900">
              Novidades da semana
            </h3>
            <p className="text-xs text-slate-500">Atualizadas para vender.</p>
          </div>
          <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {latest.length === 0 ? (
              <div className="col-span-full rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">
                Nenhum produto publicado ainda. Volte em breve.
              </div>
            ) : (
              latest.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
