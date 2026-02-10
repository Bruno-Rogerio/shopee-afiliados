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
  const topCategories = categories.slice(0, 10);
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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.9),_rgba(244,244,255,0.6))]">
      <header className="sticky top-0 z-20 border-b border-white/60 bg-white/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-5">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
              Promoções reais
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
              Listas especiais
            </Link>
            <Link
              href="#ofertas"
              className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Ver ofertas
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-6 py-10">
        <section className="relative overflow-hidden rounded-[40px] border border-white/80 bg-white/80 p-10 shadow-lg backdrop-blur">
          <div className="absolute -right-12 -top-10 h-48 w-48 rounded-full bg-amber-200/40 blur-3xl" />
          <div className="absolute -bottom-20 left-10 h-56 w-56 rounded-full bg-indigo-200/30 blur-3xl" />
          <div className="relative z-10 grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-slate-400">
                Economize hoje
              </p>
              <h2 className="mt-2 text-4xl font-semibold text-slate-900">
                As melhores promoções da internet, reunidas em um só lugar
              </h2>
              <p className="mt-4 max-w-2xl text-sm text-slate-600">
                Aqui você encontra ofertas reais, escolhidas a dedo, com
                categorias claras e listas especiais para comprar rápido e
                economizar sem perder tempo.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="#ofertas"
                  className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Ver ofertas agora
                </Link>
                <Link
                  href="/listas"
                  className="rounded-full border border-slate-200 bg-white px-5 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
                >
                  Explorar listas especiais
                </Link>
              </div>
            </div>
            <div className="grid gap-4">
              <div className="rounded-3xl border border-slate-200 bg-white px-5 py-4 text-xs text-slate-500 shadow-sm">
                Atualizado diariamente • Ofertas verificadas
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white px-5 py-4 text-xs text-slate-500 shadow-sm">
                Links rápidos • Compra segura
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white px-5 py-4 text-xs text-slate-500 shadow-sm">
                Categorias inteligentes • Mais economia
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

        <section className="mt-12 grid gap-6 lg:grid-cols-3">
          <div className="rounded-3xl border border-white/80 bg-white/80 p-6 shadow-sm">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
              1. Descubra
            </p>
            <h3 className="mt-3 text-lg font-semibold text-slate-900">
              Navegue por categorias ou listas prontas
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              Tudo organizado para você encontrar exatamente o que quer.
            </p>
          </div>
          <div className="rounded-3xl border border-white/80 bg-white/80 p-6 shadow-sm">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
              2. Compare
            </p>
            <h3 className="mt-3 text-lg font-semibold text-slate-900">
              Veja preço e desconto em segundos
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              O preço real aparece com transparência, sem surpresa no checkout.
            </p>
          </div>
          <div className="rounded-3xl border border-white/80 bg-white/80 p-6 shadow-sm">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
              3. Economize
            </p>
            <h3 className="mt-3 text-lg font-semibold text-slate-900">
              Clique e compre com segurança
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              A oferta abre direto no parceiro com checkout seguro.
            </p>
          </div>
        </section>

        {categories.length > 0 ? (
          <section className="mt-12">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h3 className="text-2xl font-semibold text-slate-900">
                Categorias que bombam
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
                  className="group rounded-3xl border border-white/60 bg-white/80 px-5 py-4 text-sm text-slate-600 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                >
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                    Categoria
                  </p>
                  <h4 className="mt-2 text-lg font-semibold text-slate-900">
                    {category.name}
                  </h4>
                  <p className="mt-1 text-xs text-slate-500">
                    {category.count} ofertas ativas
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
                    className="group rounded-3xl border border-white/70 bg-white/90 p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
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
                        "Seleção pronta para comprar sem perder tempo."}
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

        <div id="ofertas" className="pt-4" />

        {featured.length > 0 ? (
          <section className="mt-12">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-2xl font-semibold text-slate-900">
                  Destaques imperdíveis
                </h3>
                <p className="text-xs text-slate-500">
                  Promoções com maior potencial de economia.
                </p>
              </div>
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
              <div>
                <h3 className="text-2xl font-semibold text-slate-900">
                  Ofertas exclusivas
                </h3>
                <p className="text-xs text-slate-500">
                  Seleções raras para quem gosta de vantagem.
                </p>
              </div>
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
              <div>
                <h3 className="text-2xl font-semibold text-slate-900">
                  Em alta agora
                </h3>
                <p className="text-xs text-slate-500">
                  Produtos que estão bombando hoje.
                </p>
              </div>
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
              <div>
                <h3 className="text-2xl font-semibold text-slate-900">
                  Mais procurados
                </h3>
                <p className="text-xs text-slate-500">
                  Itens mais desejados da semana.
                </p>
              </div>
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
            <div>
              <h3 className="text-2xl font-semibold text-slate-900">
                Novidades da semana
              </h3>
              <p className="text-xs text-slate-500">
                Atualizadas para você aproveitar primeiro.
              </p>
            </div>
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

        <section className="mt-16 rounded-[32px] border border-white/80 bg-white/90 p-10 text-center shadow-sm">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
            Pronto para economizar?
          </p>
          <h3 className="mt-3 text-3xl font-semibold text-slate-900">
            Explore as melhores ofertas agora mesmo
          </h3>
          <p className="mt-3 text-sm text-slate-600">
            Nossa equipe atualiza diariamente para você comprar com confiança.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="#ofertas"
              className="rounded-full bg-slate-900 px-6 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Ver ofertas
            </Link>
            <Link
              href="/c"
              className="rounded-full border border-slate-200 bg-white px-6 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
            >
              Ver categorias
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
