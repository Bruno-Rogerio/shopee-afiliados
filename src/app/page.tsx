import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import { ProductCard } from "@/components/ProductCard";
import { slugify } from "@/lib/slugify";
import { getProductImages } from "@/lib/images";
import { parsePriceText } from "@/lib/pricing";
import type { Collection, CollectionItem, HomeBanner, Product } from "@/lib/types";

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

type HomeProps = {
  searchParams?: {
    q?: string;
    cat?: string;
    price?: string;
    sort?: string;
  };
};

const parseDate = (value?: string) => (value ? Date.parse(value) : 0);

const bannerThemes: Record<string, string> = {
  amber: "from-amber-100/80 via-amber-50 to-white",
  indigo: "from-indigo-100/70 via-indigo-50 to-white",
  emerald: "from-emerald-100/70 via-emerald-50 to-white",
  rose: "from-rose-100/70 via-rose-50 to-white",
  slate: "from-slate-100/70 via-white to-white",
};

const priceRanges = [
  { value: "all", label: "Todos" },
  { value: "0-50", label: "Até R$ 50" },
  { value: "50-100", label: "R$ 50 - 100" },
  { value: "100-200", label: "R$ 100 - 200" },
  { value: "200-500", label: "R$ 200 - 500" },
  { value: "500+", label: "Acima de R$ 500" },
];

const sortOptions = [
  { value: "recent", label: "Mais recentes" },
  { value: "popular", label: "Mais clicados" },
  { value: "price-asc", label: "Menor preço" },
  { value: "price-desc", label: "Maior preço" },
];

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

function filterByPrice(product: Product, priceFilter: string) {
  if (!priceFilter || priceFilter === "all") return true;
  const value = product.price_text
    ? parsePriceText(product.price_text)
    : null;
  if (value === null) return false;

  if (priceFilter === "500+") return value >= 500;
  const [min, max] = priceFilter.split("-").map(Number);
  if (!Number.isFinite(min) || !Number.isFinite(max)) return true;
  return value >= min && value <= max;
}

function sortByFilter(products: Product[], sort: string) {
  const list = [...products];

  if (sort === "price-asc") {
    return list.sort((a, b) => {
      const aValue = a.price_text ? parsePriceText(a.price_text) ?? Infinity : Infinity;
      const bValue = b.price_text ? parsePriceText(b.price_text) ?? Infinity : Infinity;
      return aValue - bValue;
    });
  }

  if (sort === "price-desc") {
    return list.sort((a, b) => {
      const aValue = a.price_text ? parsePriceText(a.price_text) ?? -Infinity : -Infinity;
      const bValue = b.price_text ? parsePriceText(b.price_text) ?? -Infinity : -Infinity;
      return bValue - aValue;
    });
  }

  if (sort === "popular") {
    return list.sort(
      (a, b) => (b.click_count ?? 0) - (a.click_count ?? 0)
    );
  }

  return list.sort((a, b) => parseDate(b.created_at) - parseDate(a.created_at));
}

function renderBannerCta(banner: HomeBanner) {
  if (!banner.cta_label || !banner.cta_url) return null;
  const isExternal = banner.cta_url.startsWith("http");
  if (isExternal) {
    return (
      <a
        href={banner.cta_url}
        className="mt-4 inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
        rel="nofollow"
      >
        {banner.cta_label}
      </a>
    );
  }
  return (
    <Link
      href={banner.cta_url}
      className="mt-4 inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
    >
      {banner.cta_label}
    </Link>
  );
}

export default async function Home({ searchParams }: HomeProps) {
  const supabase = createServerClient();
  const { data: productsData } = supabase
    ? await supabase
        .from("products")
        .select(
          "id, slug, title, description_short, price_text, image_url, image_urls, tags, category, is_featured, is_exclusive, is_trending, is_hot, featured_rank, exclusive_rank, trending_rank, hot_rank, click_count, is_active, created_at"
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
  const mostClicked = [...products]
    .sort((a, b) => (b.click_count ?? 0) - (a.click_count ?? 0))
    .slice(0, 6);
  const latest = products.slice(0, 9);

  const query = typeof searchParams?.q === "string" ? searchParams.q.trim() : "";
  const selectedCategory =
    typeof searchParams?.cat === "string" ? searchParams.cat : "all";
  const selectedPrice =
    typeof searchParams?.price === "string" ? searchParams.price : "all";
  const selectedSort =
    typeof searchParams?.sort === "string" ? searchParams.sort : "recent";
  const hasFilters =
    Boolean(query) ||
    selectedCategory !== "all" ||
    selectedPrice !== "all" ||
    selectedSort !== "recent";

  const buildFilterHref = (
    overrides: Partial<{
      q: string;
      cat: string;
      price: string;
      sort: string;
    }> = {}
  ) => {
    const next = {
      q: query,
      cat: selectedCategory,
      price: selectedPrice,
      sort: selectedSort,
      ...overrides,
    };
    const params = new URLSearchParams();
    if (next.q) params.set("q", next.q);
    if (next.cat && next.cat !== "all") params.set("cat", next.cat);
    if (next.price && next.price !== "all") params.set("price", next.price);
    if (next.sort && next.sort !== "recent") params.set("sort", next.sort);
    const queryString = params.toString();
    return queryString ? `/?${queryString}#explorar` : "/#explorar";
  };

  const filteredProducts = sortByFilter(
    products.filter((product) => {
      const matchesQuery = query
        ? product.title.toLowerCase().includes(query.toLowerCase()) ||
          (product.tags ?? []).some((tag) =>
            tag.toLowerCase().includes(query.toLowerCase())
          )
        : true;
      const matchesCategory =
        selectedCategory === "all"
          ? true
          : slugify(product.category ?? "") === selectedCategory;
      const matchesPrice = filterByPrice(product, selectedPrice);
      return matchesQuery && matchesCategory && matchesPrice;
    }),
    selectedSort
  );

  const { data: collectionsData } = supabase
    ? await supabase
        .from("collections")
        .select("id, name, slug, description, is_active")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
    : { data: [] };

  const { data: bannersData } = supabase
    ? await supabase
        .from("home_banners")
        .select("id, title, subtitle, badge, cta_label, cta_url, theme, sort_order, is_active")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
    : { data: [] };

  const banners = (bannersData ?? []) as HomeBanner[];
  const baseCollections = (collectionsData ?? []) as Collection[];
  const collectionIds = baseCollections.map((collection) => collection.id);
  const { data: collectionItemsData } =
    supabase && collectionIds.length > 0
      ? await supabase
          .from("collection_items")
          .select(
            "id, sort_order, collection_id, product_id, product:products (id, slug, title, description_short, price_text, image_url, image_urls, tags, category, is_featured, is_exclusive, is_trending, is_hot, featured_rank, exclusive_rank, trending_rank, hot_rank, click_count, is_active, created_at)"
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
              href="#explorar"
              className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Explorar ofertas
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
                Promoções selecionadas para você encontrar rápido o que procura
              </h2>
              <p className="mt-4 max-w-2xl text-sm text-slate-600">
                Esta vitrine reúne ofertas divulgadas diariamente. Compare,
                escolha sua categoria e acesse o link da oferta em poucos cliques.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="#explorar"
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
                Atualizado diariamente • Links diretos
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white px-5 py-4 text-xs text-slate-500 shadow-sm">
                Categorias inteligentes • Mais agilidade
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white px-5 py-4 text-xs text-slate-500 shadow-sm">
                Ofertas organizadas • Economia de tempo
              </div>
            </div>
          </div>
        </section>

        {banners.length > 0 ? (
          <section className="mt-8 grid gap-4 md:grid-cols-3">
            {banners.map((banner) => {
              const themeClass = banner.theme
                ? bannerThemes[banner.theme]
                : bannerThemes.slate;

              return (
                <div
                  key={banner.id}
                  className={`rounded-3xl border border-white/80 bg-gradient-to-br ${themeClass} p-6 shadow-sm`}
                >
                  {banner.badge ? (
                    <span className="rounded-full bg-slate-900 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
                      {banner.badge}
                    </span>
                  ) : null}
                  <h3 className="mt-3 text-lg font-semibold text-slate-900">
                    {banner.title}
                  </h3>
                  <p className="mt-2 text-sm text-slate-600">
                    {banner.subtitle}
                  </p>
                  {renderBannerCta(banner)}
                </div>
              );
            })}
          </section>
        ) : null}

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
              Explore categorias ou listas prontas
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
              Veja preço e destaque em segundos
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              A oferta aparece com informações essenciais para decidir rápido.
            </p>
          </div>
          <div className="rounded-3xl border border-white/80 bg-white/80 p-6 shadow-sm">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
              3. Acesse
            </p>
            <h3 className="mt-3 text-lg font-semibold text-slate-900">
              Vá direto para o link da oferta
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              Você é direcionado para o parceiro responsável pela promoção.
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
                        "Seleção pronta para encontrar as melhores ofertas."}
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

        {mostClicked.length > 0 ? (
          <section className="mt-12">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h3 className="text-2xl font-semibold text-slate-900">
                Mais clicados
              </h3>
              <p className="text-xs text-slate-500">
                Ofertas mais acessadas pelos visitantes.
              </p>
            </div>
            <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {mostClicked.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </section>
        ) : null}

        <section id="explorar" className="mt-12">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-2xl font-semibold text-slate-900">
                Explore todas as ofertas
              </h3>
              <p className="text-xs text-slate-500">
                Use filtros rápidos para achar exatamente o que procura.
              </p>
            </div>
            {hasFilters ? (
              <Link
                href="/#explorar"
                className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
              >
                Limpar filtros
              </Link>
            ) : null}
          </div>

          <div className="mt-6 rounded-3xl border border-white/70 bg-white/90 p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                Categorias rápidas
              </p>
              <Link
                href="/c"
                className="text-xs font-semibold text-slate-600 transition hover:text-slate-900"
              >
                Ver todas as categorias
              </Link>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                href={buildFilterHref({ cat: "all" })}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  selectedCategory === "all"
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900"
                }`}
              >
                Todas
                <span
                  className={`ml-2 rounded-full px-2 py-0.5 text-[10px] ${
                    selectedCategory === "all"
                      ? "bg-white/20 text-white"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {products.length}
                </span>
              </Link>
              {categories.map((category) => (
                <Link
                  key={category.slug}
                  href={buildFilterHref({ cat: category.slug })}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                    selectedCategory === category.slug
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900"
                  }`}
                >
                  {category.name}
                  <span
                    className={`ml-2 rounded-full px-2 py-0.5 text-[10px] ${
                      selectedCategory === category.slug
                        ? "bg-white/20 text-white"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {category.count}
                  </span>
                </Link>
              ))}
            </div>

            <form
              className="mt-5 flex flex-wrap gap-3"
              method="get"
            >
              <input
                type="text"
                name="q"
                defaultValue={query}
                placeholder="Buscar produto"
                className="min-w-[220px] flex-1 rounded-2xl border border-slate-200 px-4 py-2 text-sm focus:border-slate-400 focus:outline-none"
              />
              <select
                name="cat"
                defaultValue={selectedCategory}
                className="min-w-[200px] flex-1 rounded-2xl border border-slate-200 px-4 py-2 text-sm focus:border-slate-400 focus:outline-none"
              >
                <option value="all">Todas as categorias</option>
                {categories.map((category) => (
                  <option key={category.slug} value={category.slug}>
                    {category.name}
                  </option>
                ))}
              </select>
              <select
                name="price"
                defaultValue={selectedPrice}
                className="min-w-[180px] flex-1 rounded-2xl border border-slate-200 px-4 py-2 text-sm focus:border-slate-400 focus:outline-none"
              >
                {priceRanges.map((range) => (
                  <option key={range.value} value={range.value}>
                    {range.label}
                  </option>
                ))}
              </select>
              <select
                name="sort"
                defaultValue={selectedSort}
                className="min-w-[180px] flex-1 rounded-2xl border border-slate-200 px-4 py-2 text-sm focus:border-slate-400 focus:outline-none"
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="w-full rounded-2xl bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 sm:w-auto"
              >
                Filtrar
              </button>
            </form>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
              <span>{filteredProducts.length} ofertas encontradas.</span>
              {hasFilters ? (
                <span>Filtros ativos na vitrine.</span>
              ) : null}
            </div>
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredProducts.length === 0 ? (
              <div className="col-span-full rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">
                Nenhuma oferta encontrada com esses filtros.
              </div>
            ) : (
              filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))
            )}
          </div>
        </section>

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
                  Produtos com maior atenção no momento.
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
            Quer mais ofertas?
          </p>
          <h3 className="mt-3 text-3xl font-semibold text-slate-900">
            Explore as categorias e listas especiais
          </h3>
          <p className="mt-3 text-sm text-slate-600">
            Novas promoções são adicionadas diariamente.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/c"
              className="rounded-full bg-slate-900 px-6 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Ver categorias
            </Link>
            <Link
              href="/listas"
              className="rounded-full border border-slate-200 bg-white px-6 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
            >
              Ver listas
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
