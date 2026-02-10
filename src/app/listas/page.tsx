import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import { getProductImages } from "@/lib/images";
import type { Collection, CollectionItem, Product } from "@/lib/types";

export const revalidate = 60;

type CollectionWithItems = Collection & { items: CollectionItem[] };

export default async function CollectionsPage() {
  const supabase = createServerClient();
  const { data: collectionsData } = supabase
    ? await supabase
        .from("collections")
        .select("id, name, slug, description, is_active")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
    : { data: [] };

  const baseCollections = (collectionsData ?? []) as Collection[];
  const collectionIds = baseCollections.map((collection) => collection.id);

  const { data: itemsData } =
    supabase && collectionIds.length > 0
      ? await supabase
          .from("collection_items")
          .select(
            "id, sort_order, collection_id, product_id, product:products (id, title, slug, image_url, image_urls, is_active)"
          )
          .in("collection_id", collectionIds)
          .order("sort_order", { ascending: true })
      : { data: [] };

  const items = (itemsData ?? []).map((item) => {
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
  const totalItems = collections.reduce(
    (sum, collection) => sum + collection.items.length,
    0
  );

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
              Listas especiais
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              {collections.length} listas publicadas · {totalItems} ofertas.
            </p>
          </div>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {collections.length === 0 ? (
            <div className="col-span-full rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">
              Nenhuma lista publicada ainda.
            </div>
          ) : (
            collections.map((collection) => {
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
                  className="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                        Lista
                      </p>
                      <h2 className="mt-2 text-xl font-semibold text-slate-900">
                        {collection.name}
                      </h2>
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
                    {previewImages.map((url, index) => (
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
                    ))}
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
