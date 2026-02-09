"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { slugify } from "@/lib/slugify";
import { getProductImages } from "@/lib/images";
import type { Collection, CollectionItem, Product } from "@/lib/types";

type CollectionFormState = {
  id?: string;
  name: string;
  slug: string;
  description: string;
  is_active: boolean;
};

type CollectionItemWithProduct = CollectionItem & { product: Product | null };

const emptyForm: CollectionFormState = {
  name: "",
  slug: "",
  description: "",
  is_active: true,
};

export default function AdminCollectionsPage() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [items, setItems] = useState<CollectionItemWithProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);
  const [form, setForm] = useState<CollectionFormState>(emptyForm);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [productFilter, setProductFilter] = useState("");
  const itemsRef = useRef<HTMLDivElement | null>(null);

  const isEditing = Boolean(form.id);
  const selectedCollection = collections.find(
    (collection) => collection.id === selectedCollectionId
  );

  const fetchCollections = useCallback(async () => {
    setLoading(true);
    const { data, error: fetchError } = await supabase
      .from("collections")
      .select("*")
      .order("created_at", { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setCollections((data ?? []) as Collection[]);
    }
    setLoading(false);
  }, []);

  const fetchProducts = useCallback(async () => {
    const { data, error: fetchError } = await supabase
      .from("products")
      .select("id, title, slug, image_url, image_urls, is_active, price_text")
      .order("created_at", { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setProducts((data ?? []) as Product[]);
    }
  }, []);

  const fetchItems = useCallback(async (collectionId: string) => {
    const { data, error: fetchError } = await supabase
      .from("collection_items")
      .select(
        "id, sort_order, collection_id, product_id, product:products (id, title, slug, image_url, image_urls, is_active, price_text)"
      )
      .eq("collection_id", collectionId)
      .order("sort_order", { ascending: true });

    if (fetchError) {
      setError(fetchError.message);
    } else {
      const normalized = (data ?? []).map((item) => {
        const product = Array.isArray(item.product)
          ? item.product[0] ?? null
          : item.product ?? null;
        return { ...item, product };
      });
      setItems(normalized as CollectionItemWithProduct[]);
    }
  }, []);

  useEffect(() => {
    void fetchCollections();
    void fetchProducts();
  }, [fetchCollections, fetchProducts]);

  useEffect(() => {
    if (!selectedCollectionId) {
      setItems([]);
      return;
    }
    void fetchItems(selectedCollectionId);
  }, [selectedCollectionId, fetchItems]);

  const availableProducts = useMemo(() => {
    const usedIds = new Set(items.map((item) => item.product_id));
    const filtered = products.filter((product) => !usedIds.has(product.id));
    if (!productFilter.trim()) return filtered;
    const term = productFilter.toLowerCase();
    return filtered.filter((product) =>
      product.title.toLowerCase().includes(term)
    );
  }, [products, items, productFilter]);

  const handleFormChange = (
    field: keyof CollectionFormState,
    value: string | boolean
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setForm(emptyForm);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    setError(null);

    const name = form.name.trim();
    if (!name) {
      setError("Nome da lista é obrigatório.");
      return;
    }

    const slug = form.slug.trim() || slugify(name);
    if (!slug) {
      setError("Slug inválido.");
      return;
    }

    setSaving(true);
    const payload = {
      name,
      slug,
      description: form.description.trim() || null,
      is_active: form.is_active,
    };

    if (isEditing && form.id) {
      const { error: updateError } = await supabase
        .from("collections")
        .update(payload)
        .eq("id", form.id);

      if (updateError) {
        setError(updateError.message);
      } else {
        setMessage("Lista atualizada.");
        resetForm();
        await fetchCollections();
      }
    } else {
      const { error: insertError } = await supabase
        .from("collections")
        .insert(payload);

      if (insertError) {
        setError(insertError.message);
      } else {
        setMessage("Lista criada.");
        resetForm();
        await fetchCollections();
      }
    }

    setSaving(false);
  };

  const handleEdit = (collection: Collection) => {
    setForm({
      id: collection.id,
      name: collection.name,
      slug: collection.slug,
      description: collection.description ?? "",
      is_active: collection.is_active,
    });
  };

  const handleDelete = async (collectionId: string) => {
    const confirmed = window.confirm("Deseja remover esta lista?");
    if (!confirmed) return;

    const { error: deleteError } = await supabase
      .from("collections")
      .delete()
      .eq("id", collectionId);

    if (deleteError) {
      setError(deleteError.message);
    } else {
      setMessage("Lista removida.");
      if (selectedCollectionId === collectionId) {
        setSelectedCollectionId(null);
      }
      await fetchCollections();
    }
  };

  const handleSelectCollection = (collectionId: string) => {
    setSelectedCollectionId(collectionId);
    setTimeout(() => {
      itemsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  };

  const handleAddProduct = async (productId: string) => {
    if (!selectedCollectionId) return;
    setSaving(true);
    setError(null);

    const nextOrder = items.length + 1;
    const { error: insertError } = await supabase
      .from("collection_items")
      .insert({
        collection_id: selectedCollectionId,
        product_id: productId,
        sort_order: nextOrder,
      });

    if (insertError) {
      setError(insertError.message);
    } else {
      setMessage("Produto adicionado na lista.");
      await fetchItems(selectedCollectionId);
    }

    setSaving(false);
  };

  const handleRemoveItem = async (itemId: string) => {
    if (!selectedCollectionId) return;
    setSaving(true);
    setError(null);

    const { error: deleteError } = await supabase
      .from("collection_items")
      .delete()
      .eq("id", itemId);

    if (deleteError) {
      setError(deleteError.message);
    } else {
      setMessage("Item removido da lista.");
      await fetchItems(selectedCollectionId);
    }

    setSaving(false);
  };

  const handleMoveItem = async (index: number, direction: number) => {
    if (savingOrder) return;
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= items.length) return;

    const nextItems = [...items];
    [nextItems[index], nextItems[targetIndex]] = [
      nextItems[targetIndex],
      nextItems[index],
    ];

    const updates = nextItems.map((item, idx) => ({
      id: item.id,
      sort_order: idx + 1,
    }));

    setSavingOrder(true);
    const { error: updateError } = await supabase
      .from("collection_items")
      .upsert(updates, { onConflict: "id" });

    if (updateError) {
      setError(updateError.message);
    } else {
      setItems(
        nextItems.map((item, idx) => ({
          ...item,
          sort_order: idx + 1,
        }))
      );
    }
    setSavingOrder(false);
  };

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              {isEditing ? "Editar lista" : "Nova lista"}
            </h2>
            <p className="text-sm text-slate-500">
              Crie listas especiais para destacar ofertas na home.
            </p>
          </div>
          {isEditing ? (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-full border border-slate-200 px-4 py-2 text-xs text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
            >
              Cancelar edição
            </button>
          ) : null}
        </div>
        <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-medium text-slate-700">
              Nome
              <input
                type="text"
                value={form.name}
                onChange={(event) =>
                  handleFormChange("name", event.target.value)
                }
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-2 text-sm focus:border-slate-400 focus:outline-none"
                required
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Slug
              <input
                type="text"
                value={form.slug}
                onChange={(event) =>
                  handleFormChange("slug", event.target.value)
                }
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-2 text-sm focus:border-slate-400 focus:outline-none"
                placeholder="deixe vazio para gerar"
              />
            </label>
          </div>
          <label className="text-sm font-medium text-slate-700">
            Descrição
            <textarea
              value={form.description}
              onChange={(event) =>
                handleFormChange("description", event.target.value)
              }
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-2 text-sm focus:border-slate-400 focus:outline-none"
              rows={3}
            />
          </label>
          <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(event) =>
                handleFormChange("is_active", event.target.checked)
              }
              className="h-4 w-4 rounded border-slate-300 text-slate-900"
            />
            Lista ativa na home
          </label>
          {message ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs text-emerald-700">
              {message}
            </div>
          ) : null}
          {error ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs text-rose-700">
              {error}
            </div>
          ) : null}
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
          >
            {saving
              ? "Salvando..."
              : isEditing
                ? "Atualizar lista"
                : "Criar lista"}
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Listas cadastradas
            </h2>
            <p className="text-sm text-slate-500">
              Clique em editar ou gerencie os itens de cada lista.
            </p>
          </div>
          <button
            type="button"
            onClick={fetchCollections}
            className="rounded-full border border-slate-200 px-4 py-2 text-xs text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
          >
            Atualizar listas
          </button>
        </div>

        <div className="mt-6 space-y-4">
          {loading ? (
            <p className="text-sm text-slate-500">Carregando listas...</p>
          ) : null}
          {!loading && collections.length === 0 ? (
            <p className="text-sm text-slate-500">
              Nenhuma lista criada ainda.
            </p>
          ) : null}
          {collections.map((collection) => (
            <div
              key={collection.id}
              className={`rounded-2xl border px-4 py-4 transition ${
                selectedCollectionId === collection.id
                  ? "border-slate-900 bg-slate-900/5"
                  : "border-slate-200 bg-slate-50"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-semibold text-slate-900">
                      {collection.name}
                    </h3>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] uppercase tracking-wide ${
                        collection.is_active
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {collection.is_active ? "Ativa" : "Pausada"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">/listas/{collection.slug}</p>
                  {collection.description ? (
                    <p className="mt-2 text-sm text-slate-600">
                      {collection.description}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleEdit(collection)}
                    className="rounded-full border border-slate-200 px-4 py-2 text-xs text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectCollection(collection.id)}
                    className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
                  >
                    Itens
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(collection.id)}
                    className="rounded-full border border-rose-200 px-4 py-2 text-xs text-rose-600 transition hover:border-rose-300 hover:text-rose-700"
                  >
                    Excluir
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section
        ref={itemsRef}
        className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Itens da lista
            </h2>
            <p className="text-sm text-slate-500">
              {selectedCollection
                ? `Gerenciando: ${selectedCollection.name}`
                : "Selecione uma lista para gerenciar os itens."}
            </p>
          </div>
        </div>

        {!selectedCollection ? (
          <p className="mt-6 text-sm text-slate-500">
            Escolha uma lista acima para adicionar produtos.
          </p>
        ) : (
          <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Adicionar produtos
              </h3>
              <input
                type="text"
                value={productFilter}
                onChange={(event) => setProductFilter(event.target.value)}
                placeholder="Buscar produto"
                className="mt-3 w-full rounded-xl border border-slate-200 px-4 py-2 text-sm focus:border-slate-400 focus:outline-none"
              />
              <div className="mt-4 max-h-72 space-y-2 overflow-auto pr-2">
                {availableProducts.length === 0 ? (
                  <p className="text-xs text-slate-500">
                    Nenhum produto disponível para adicionar.
                  </p>
                ) : (
                  availableProducts.slice(0, 20).map((product) => {
                    const images = getProductImages(product);
                    return (
                      <div
                        key={product.id}
                        className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 overflow-hidden rounded-xl bg-slate-100">
                            {images[0] ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={images[0]}
                                alt={product.title}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-[10px] text-slate-400">
                                sem
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-900">
                              {product.title}
                            </p>
                            <p className="text-xs text-slate-500">
                              {product.price_text || "sem preço"}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleAddProduct(product.id)}
                          disabled={saving}
                          className="rounded-full border border-slate-200 px-3 py-1.5 text-xs text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:opacity-60"
                        >
                          Adicionar
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Ordem da lista
              </h3>
              <div className="mt-4 space-y-3">
                {items.length === 0 ? (
                  <p className="text-xs text-slate-500">
                    Nenhum item nesta lista ainda.
                  </p>
                ) : (
                  items.map((item, index) => {
                    const product = item.product;
                    const images = product ? getProductImages(product) : [];
                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 overflow-hidden rounded-xl bg-slate-100">
                            {images[0] ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={images[0]}
                                alt={product?.title || "Produto"}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-[10px] text-slate-400">
                                sem
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-900">
                              {product?.title || "Produto"}
                            </p>
                            <p className="text-xs text-slate-500">
                              {product?.price_text || "sem preço"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleMoveItem(index, -1)}
                            disabled={index === 0 || savingOrder}
                            className="rounded-full border border-slate-200 px-2.5 py-1 text-xs text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:opacity-40"
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveItem(index, 1)}
                            disabled={index === items.length - 1 || savingOrder}
                            className="rounded-full border border-slate-200 px-2.5 py-1 text-xs text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:opacity-40"
                          >
                            ↓
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.id)}
                            disabled={saving}
                            className="rounded-full border border-rose-200 px-2.5 py-1 text-xs text-rose-600 transition hover:border-rose-300 hover:text-rose-700 disabled:opacity-40"
                          >
                            Remover
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
