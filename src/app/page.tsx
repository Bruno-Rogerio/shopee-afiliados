import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import { ProductCard } from "@/components/ProductCard";
import { slugify } from "@/lib/slugify";
import { getProductImages } from "@/lib/images";
import type { Collection, CollectionItem, Product } from "@/lib/types";

export const revalidate = 60;

type CategorySummary = {
  name: string;
  slug: string;
  count: number;
};

type RankKey =
  | "featured_rank"
  | "exclusive_rank"
  | "trending_rank"
  | "hot_rank";

type CollectionWithItems = Collection & { items: CollectionItem[] };

const parseDate = (value?: string) => (value ? Date.parse(value) : 0);

function sortByRank(list: Product[], key: RankKey) {
  return [...list].sort((a, b) => {
    const aRank = a[key];
    const bRank = b[key];

    if (aRank == null && bRank == null) {
      return parseDate(b.created_at) - parseDate(a.created_at);
    }
    if (aRank == null) return 1;
    if (bRank == null) return -1;
    if (aRank !== bRank) return aRank - bRank;
    return parseDate(b.created_at) - parseDate(a.created_at);
  });
}

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

export default async function Home() {
  const supabase = createServerClient();
  const { data: productsData } = supabase
    ? await supabase
        .from("products")
        .select(
          "id, slug, title, description_short, price_text, image_url, image_urls, tags, category, is_featured, is_exclusive, is_trending, is_hot, featured_rank, exclusive_rank, trending_rank, hot_rank, is_active, created_at"
        )
        .eq("is_active", true)
        .order("created_at", { ascending: false })
    : { data: [] };

  const products = (productsData ?? []) as Product[];
  const categories = buildCategories(products);
  const topCategories = categories.slice(0, 12);
  const featured = sortByRank(
    products.filter((product) => product.is_featured),
    "featured_rank"
  );
  const exclusives = sortByRank(
    products.filter((product) => product.is_exclusive),
    "exclusive_rank"
  );
  const trending = sortByRank(
    products.filter((product) => product.is_trending),
    "trending_rank"
  );
  const hot = sortByRank(
    products.filter((product) => product.is_hot),
    "hot_rank"
  );
  const latest = products.slice(0, 9);

  const { data: collectionsData } = supabase
    ? await supabase
        .from("collections")
        .select("id, name, slug, description, is_active")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
    : { data: [] };

  const baseCollections = (collectionsData ?? []) as Collection[];
  const collectionIds = baseCollections.map((collection) => collection.id);
  const { data: collectionItemsData } =
    supabase && collectionIds.length > 0
      ? await supabase
          .from("collection_items")
          .select(
            "id, sort_order, collection_id, product_id, product:products (id, slug, title, description_short, price_text, image_url, image_urls, tags, category, is_featured, is_exclusive, is_trending, is_hot, featured_rank, exclusive_rank, trending_rank, hot_rank, is_active, created_at)"
          )
          .in("collection_id", collectionIds)
          .order("sort_order", { ascending: true })
      : { data: [] };

  const items = (collectionItemsData ?? []).map((item) => {
    const product = Array.isArray(item.product)
      ? item.product[0] ?? null
      : item.product ?? null;
    return { ...item, product };
  }) as (CollectionItem & { product: Product | null })[];
  const itemsByCollection = new Map<string, CollectionItem[]>();

  items.forEach((item) => {
    if (!item.product || !item.product.is_active) return;
    const entry: CollectionItem = {
      id: item.id,
      collection_id: item.collection_id,
      product_id: item.product_id,
      sort_order: item.sort_order,
      product: item.product,
    };
    const existing = itemsByCollection.get(item.collection_id) ?? [];
    existing.push(entry);
    itemsByCollection.set(item.collection_id, existing);
  });

  const collections: CollectionWithItems[] = baseCollections
    .map((collection) => ({
      ...collection,
      items: itemsByCollection.get(collection.id) ?? [],
    }))
    .filter((collection) => collection.items.length > 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f4f4ff] via-white to-[#fef7f0]">
      <header className="border-b border-white/60 bg-white/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-6">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
              Catálogo de Afiliados
            </p>
            <h1 className="text-2xl font-semibold text-slate-900">
              Vitrine de Ofertas
            </h1>
          </div>
          <nav className="flex flex-wrap items-center gap-3 text-sm">
            <Link
              href="/c"
              className="rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
            >
              Categorias
            </Link>
            <Link
              href="/listas"
              className="rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
            >
              Listas
            </Link>
            <Link
              href="/admin"
              className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Painel admin
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-6 py-10">
        <section className="relative overflow-hidden rounded-[36px] border border-white/80 bg-white/70 p-10 shadow-lg backdrop-blur">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-amber-200/30 blur-2xl" />
          <div className="absolute -bottom-16 left-10 h-48 w-48 rounded-full bg-indigo-200/40 blur-2xl" />
          <div className="relative z-10 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-slate-400">
                Seleção do dia
              </p>
              <h2 className="mt-2 text-4xl font-semibold text-slate-900">
                Achados quentes, exclusivos e com desconto de verdade
              </h2>
              <p className="mt-4 max-w-2xl text-sm text-slate-600">
                Monte sua vitrine com categorias, listas especiais e ofertas
                prontas para compartilhar no WhatsApp e Instagram.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/c"
                  className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Explorar categorias
                </Link>
                <Link
                  href="/listas"
                  className="rounded-full border border-slate-200 bg-white px-5 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
                >
                  Ver listas prontas
                </Link>
              </div>
            </div>
            <div className="grid gap-4">
              <div className="rounded-3xl border border-slate-200 bg-white px-5 py-4 text-xs text-slate-500 shadow-sm">
                Atualizado diariamente • Tracking ativo
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white px-5 py-4 text-xs text-slate-500 shadow-sm">
                Copys prontas para conversão • Links com tracking
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white px-5 py-4 text-xs text-slate-500 shadow-sm">
                Curadoria inteligente • Destaques por categoria
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-600">
            <p className="text-xs uppercase tracking-wide text-slate-400">
              Ofertas ativas
            </p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {products.length}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-600">
            <p className="text-xs uppercase tracking-wide text-slate-400">
              Categorias
            </p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {categories.length}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-600">
            <p className="text-xs uppercase tracking-wide text-slate-400">
              Listas especiais
            </p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {collections.length}
            </p>
          </div>
        </section>

        {categories.length > 0 ? (
          <section className="mt-10">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h3 className="text-xl font-semibold text-slate-900">
                Categorias em destaque
              </h3>
              <Link
                href="/c"
                className="text-xs font-semibold text-slate-600 transition hover:text-slate-900"
              >
                Ver todas
              </Link>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {topCategories.map((category) => (
                <Link
                  key={category.slug}
                  href={`/c/${category.slug}`}
                  className="group rounded-3xl border border-white/60 bg-white/70 px-5 py-4 text-sm text-slate-600 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                >
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                    Categoria
                  </p>
                  <h4 className="mt-2 text-lg font-semibold text-slate-900">
                    {category.name}
                  </h4>
                  <p className="mt-1 text-xs text-slate-500">
                    {category.count} ofertas
                  </p>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {collections.length > 0 ? (
          <section className="mt-12">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h3 className="text-2xl font-semibold text-slate-900">
                Listas especiais
              </h3>
              <Link
                href="/listas"
                className="text-xs font-semibold text-slate-600 transition hover:text-slate-900"
              >
                Ver todas
              </Link>
            </div>
            <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {collections.map((collection) => {
                const preview = collection.items.slice(0, 3);
                const previewImages = preview
                  .map((item) =>
                    item.product ? getProductImages(item.product)[0] : null
                  )
                  .filter(Boolean) as string[];

                return (
                  <Link
                    key={collection.id}
                    href={`/listas/${collection.slug}`}
                    className="group rounded-3xl border border-white/70 bg-white/80 p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                          Lista especial
                        </p>
                        <h4 className="mt-2 text-lg font-semibold text-slate-900">
                          {collection.name}
                        </h4>
                      </div>
                      <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
                        {collection.items.length} itens
                      </span>
                    </div>
                    <p className="mt-3 text-sm text-slate-600">
                      {collection.description ||
                        "Seleção pronta para compartilhar com seu público."}
                    </p>
                    <div className="mt-4 flex -space-x-4">
                      {previewImages.length > 0
                        ? previewImages.map((url, index) => (
                            <div
                              key={`${collection.id}-preview-${index}`}
                              className="h-16 w-16 overflow-hidden rounded-2xl border-2 border-white bg-slate-100"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={url}
                                alt="Preview"
                                className="h-full w-full object-cover"
                              />
                            </div>
                          ))
                        : null}
                    </div>
                  </Link>
                );
              })}
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
