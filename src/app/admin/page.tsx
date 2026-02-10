"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { slugify } from "@/lib/slugify";
import { isValidUrl } from "@/lib/validation";
import { CATEGORY_OPTIONS } from "@/lib/categories";
import type { Product } from "@/lib/types";

type FormState = {
  id?: string;
  title: string;
  slug: string;
  description_short: string;
  price_text: string;
  image_urls: string[];
  origin_url: string;
  affiliate_url: string;
  tags: string;
  store_name: string;
  category: string;
  is_featured: boolean;
  is_exclusive: boolean;
  is_trending: boolean;
  is_hot: boolean;
  featured_rank: string;
  exclusive_rank: string;
  trending_rank: string;
  hot_rank: string;
  is_active: boolean;
};

const emptyForm: FormState = {
  title: "",
  slug: "",
  description_short: "",
  price_text: "",
  image_urls: [],
  origin_url: "",
  affiliate_url: "",
  tags: "",
  store_name: "",
  category: "",
  is_featured: false,
  is_exclusive: false,
  is_trending: false,
  is_hot: false,
  featured_rank: "",
  exclusive_rank: "",
  trending_rank: "",
  hot_rank: "",
  is_active: false,
};


export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "published" | "draft"
  >("all");
  const [categoryFilter, setCategoryFilter] = useState<
    "all" | "uncategorized"
  >("all");
  const [bulkCategory, setBulkCategory] = useState("");
  const [imageUrlInput, setImageUrlInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const formRef = useRef<HTMLDivElement | null>(null);
  const titleInputRef = useRef<HTMLInputElement | null>(null);

  const isEditing = Boolean(form.id);

  const filteredProducts = useMemo(() => {
    let list = products;

    if (statusFilter === "published") {
      list = list.filter((product) => product.is_active);
    } else if (statusFilter === "draft") {
      list = list.filter((product) => !product.is_active);
    }

    if (categoryFilter === "uncategorized") {
      list = list.filter((product) => !product.category);
    }

    const term = searchQuery.trim().toLowerCase();
    if (!term) return list;

    return list.filter((product) => {
      const title = product.title?.toLowerCase() ?? "";
      const slug = product.slug?.toLowerCase() ?? "";
      const store = product.store_name?.toLowerCase() ?? "";
      const category = product.category?.toLowerCase() ?? "";
      const price = product.price_text?.toLowerCase() ?? "";
      const tags = (product.tags ?? []).some((tag) =>
        tag.toLowerCase().includes(term)
      );

      return (
        title.includes(term) ||
        slug.includes(term) ||
        store.includes(term) ||
        category.includes(term) ||
        price.includes(term) ||
        tags
      );
    });
  }, [products, statusFilter, categoryFilter, searchQuery]);

  const publishedCount = useMemo(
    () => products.filter((product) => product.is_active).length,
    [products]
  );
  const draftCount = products.length - publishedCount;
  const uncategorizedCount = useMemo(
    () => products.filter((product) => !product.category).length,
    [products]
  );

  const needsAttention = useMemo(() => {
    return new Set(
      products
        .filter(
          (product) => {
            const hasImage =
              (product.image_urls?.length ?? 0) > 0 || product.image_url;
            return (
              !product.is_active &&
              product.external_id &&
              (!hasImage || !product.category)
            );
          }
        )
        .map((product) => product.id)
    );
  }, [products]);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: fetchError } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setProducts((data ?? []) as Product[]);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    setSelectedIds((prev) => prev.filter((id) => products.some((p) => p.id === id)));
  }, [products]);

  const handleChange = (field: keyof FormState, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setForm(emptyForm);
    setImageUrlInput("");
  };

  const validateForm = () => {
    const title = form.title.trim();
    const originUrl = form.origin_url.trim();

    if (!title) return "Titulo e obrigatorio.";
    if (!originUrl) return "Link original e obrigatorio.";
    if (!isValidUrl(originUrl)) return "Link original invalido.";
    if (form.affiliate_url && !isValidUrl(form.affiliate_url.trim())) {
      return "Link de afiliado invalido.";
    }
    const invalidImage = form.image_urls.find(
      (url) => url && !isValidUrl(url)
    );
    if (invalidImage) return "URL da imagem invalida.";

    const rankFields = [
      { label: "Ordem destaque", value: form.featured_rank },
      { label: "Ordem exclusiva", value: form.exclusive_rank },
      { label: "Ordem em alta", value: form.trending_rank },
      { label: "Ordem mais procurados", value: form.hot_rank },
    ];

    for (const field of rankFields) {
      if (!field.value.trim()) continue;
      const parsed = Number(field.value);
      if (!Number.isFinite(parsed) || parsed < 0) {
        return `${field.label} invalida.`;
      }
    }

    return null;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    setError(null);

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    const tagsArray = form.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    const slug = form.slug.trim() || slugify(form.title);
    if (!slug) {
      setError("Slug invalido.");
      return;
    }

    const parseRank = (value: string) => {
      const trimmed = value.trim();
      if (!trimmed) return null;
      const parsed = Number(trimmed);
      return Number.isFinite(parsed) ? parsed : null;
    };

    const payload = {
      title: form.title.trim(),
      slug,
      description_short: form.description_short.trim() || null,
      price_text: form.price_text.trim() || null,
      image_urls: form.image_urls,
      image_url: form.image_urls[0] ?? null,
      origin_url: form.origin_url.trim(),
      affiliate_url: form.affiliate_url.trim() || null,
      tags: tagsArray,
      store_name: form.store_name.trim() || null,
      category: form.category.trim() || null,
      is_featured: form.is_featured,
      is_exclusive: form.is_exclusive,
      is_trending: form.is_trending,
      is_hot: form.is_hot,
      featured_rank: form.is_featured ? parseRank(form.featured_rank) : null,
      exclusive_rank: form.is_exclusive ? parseRank(form.exclusive_rank) : null,
      trending_rank: form.is_trending ? parseRank(form.trending_rank) : null,
      hot_rank: form.is_hot ? parseRank(form.hot_rank) : null,
      is_active: form.is_active,
    };

    setSaving(true);

    if (isEditing && form.id) {
      const { error: updateError } = await supabase
        .from("products")
        .update(payload)
        .eq("id", form.id);

      if (updateError) {
        setError(updateError.message);
      } else {
        setMessage("Produto atualizado.");
        resetForm();
        setImageUrlInput("");
        await fetchProducts();
      }
    } else {
      const { error: insertError } = await supabase
        .from("products")
        .insert(payload);

      if (insertError) {
        setError(insertError.message);
      } else {
        setMessage("Produto criado.");
        resetForm();
        setImageUrlInput("");
        await fetchProducts();
      }
    }

    setSaving(false);
  };

  const handleEdit = (product: Product) => {
    setMessage(null);
    setError(null);
    setImageUrlInput("");
    setForm({
      id: product.id,
      title: product.title ?? "",
      slug: product.slug ?? "",
      description_short: product.description_short ?? "",
      price_text: product.price_text ?? "",
      image_urls:
        product.image_urls && product.image_urls.length > 0
          ? product.image_urls
          : product.image_url
            ? [product.image_url]
            : [],
      origin_url: product.origin_url ?? "",
      affiliate_url: product.affiliate_url ?? "",
      tags: (product.tags ?? []).join(", "),
      store_name: product.store_name ?? "",
      category: product.category ?? "",
      is_featured: product.is_featured ?? false,
      is_exclusive: product.is_exclusive ?? false,
      is_trending: product.is_trending ?? false,
      is_hot: product.is_hot ?? false,
      featured_rank:
        product.featured_rank !== null && product.featured_rank !== undefined
          ? String(product.featured_rank)
          : "",
      exclusive_rank:
        product.exclusive_rank !== null && product.exclusive_rank !== undefined
          ? String(product.exclusive_rank)
          : "",
      trending_rank:
        product.trending_rank !== null && product.trending_rank !== undefined
          ? String(product.trending_rank)
          : "",
      hot_rank:
        product.hot_rank !== null && product.hot_rank !== undefined
          ? String(product.hot_rank)
          : "",
      is_active: product.is_active ?? false,
    });

    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      titleInputRef.current?.focus();
    }, 0);
  };

  const handleDelete = async (productId: string) => {
    const confirmed = window.confirm("Deseja remover este produto?");
    if (!confirmed) return;

    const { error: deleteError } = await supabase
      .from("products")
      .delete()
      .eq("id", productId);

    if (deleteError) {
      setError(deleteError.message);
    } else {
      setMessage("Produto removido.");
      await fetchProducts();
    }
  };

  const handleSelectAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      filteredProducts.forEach((product) => next.add(product.id));
      return Array.from(next);
    });
  };

  const handleClearSelectionVisible = () => {
    const visibleIds = new Set(filteredProducts.map((product) => product.id));
    setSelectedIds((prev) => prev.filter((id) => !visibleIds.has(id)));
  };

  const handleClearFilters = () => {
    setStatusFilter("all");
    setCategoryFilter("all");
    setSearchQuery("");
  };

  const handleToggleSelect = (productId: string) => {
    setSelectedIds((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId]
    );
  };

  const handlePublishSelected = async () => {
    if (selectedIds.length === 0) return;

    setSaving(true);
    setError(null);
    const { error: publishError } = await supabase
      .from("products")
      .update({ is_active: true })
      .in("id", selectedIds);

    if (publishError) {
      setError(publishError.message);
    } else {
      setMessage(`${selectedIds.length} produtos publicados.`);
      setSelectedIds([]);
      handleClearFilters();
      await fetchProducts();
    }

    setSaving(false);
  };

  const handleApplyCategorySelected = async () => {
    if (selectedIds.length === 0) return;
    if (!bulkCategory.trim()) {
      setError("Selecione uma categoria para aplicar.");
      return;
    }

    setSaving(true);
    setError(null);

    const { error: updateError } = await supabase
      .from("products")
      .update({ category: bulkCategory })
      .in("id", selectedIds);

    if (updateError) {
      setError(updateError.message);
    } else {
      setMessage(`Categoria aplicada em ${selectedIds.length} produtos.`);
      setBulkCategory("");
      setSelectedIds([]);
      handleClearFilters();
      await fetchProducts();
    }

    setSaving(false);
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    const confirmed = window.confirm(
      `Deseja remover ${selectedIds.length} produtos?`
    );
    if (!confirmed) return;

    setDeleting(true);
    setError(null);

    const { error: deleteError } = await supabase
      .from("products")
      .delete()
      .in("id", selectedIds);

    if (deleteError) {
      setError(deleteError.message);
    } else {
      setMessage(`${selectedIds.length} produtos removidos.`);
      setSelectedIds([]);
      handleClearFilters();
      await fetchProducts();
    }

    setDeleting(false);
  };

  const handleAddImageUrl = () => {
    const trimmed = imageUrlInput.trim();
    if (!trimmed) return;
    if (!isValidUrl(trimmed)) {
      setError("URL da imagem invalida.");
      return;
    }
    setForm((prev) => ({
      ...prev,
      image_urls: [...prev.image_urls, trimmed],
    }));
    setImageUrlInput("");
  };

  const handleRemoveImage = (index: number) => {
    setForm((prev) => ({
      ...prev,
      image_urls: prev.image_urls.filter((_, idx) => idx !== index),
    }));
  };

  const handleUploadImage = async (file: File) => {
    setUploading(true);
    setError(null);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const dataUrl = reader.result as string;
        const response = await fetch("/api/products/upload-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dataUrl, fileName: file.name }),
        });

        if (!response.ok) {
          setError("Falha ao enviar imagem.");
          setUploading(false);
          return;
        }

        const payload = (await response.json()) as { url?: string };
        if (!payload.url) {
          setError("Falha ao enviar imagem.");
          setUploading(false);
          return;
        }

        setForm((prev) => ({
          ...prev,
          image_urls: [...prev.image_urls, payload.url!],
        }));
      } catch {
        setError("Falha ao enviar imagem.");
      } finally {
        setUploading(false);
      }
    };
    reader.onerror = () => {
      setError("Falha ao ler imagem.");
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-10">
      <section
        ref={formRef}
        className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              {isEditing ? "Editar produto" : "Novo produto"}
            </h2>
            <p className="text-sm text-slate-500">
              Preencha o minimo para publicar. Tags separadas por virgula.
            </p>
          </div>
          {isEditing ? (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-full border border-slate-200 px-4 py-2 text-xs text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
            >
              Cancelar edicao
            </button>
          ) : null}
        </div>
        <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-medium text-slate-700">
              Titulo
              <input
                ref={titleInputRef}
                type="text"
                value={form.title}
                onChange={(event) => handleChange("title", event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-2 text-sm focus:border-slate-400 focus:outline-none"
                required
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Slug
              <input
                type="text"
                value={form.slug}
                onChange={(event) => handleChange("slug", event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-2 text-sm focus:border-slate-400 focus:outline-none"
                placeholder="deixe vazio para gerar"
              />
            </label>
          </div>
          <label className="text-sm font-medium text-slate-700">
            Descricao curta
            <textarea
              value={form.description_short}
              onChange={(event) =>
                handleChange("description_short", event.target.value)
              }
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-2 text-sm focus:border-slate-400 focus:outline-none"
              rows={3}
            />
          </label>
          <div className="grid gap-4 md:grid-cols-3">
            <label className="text-sm font-medium text-slate-700">
            Preço
              <input
                type="text"
                value={form.price_text}
                onChange={(event) =>
                  handleChange("price_text", event.target.value)
                }
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-2 text-sm focus:border-slate-400 focus:outline-none"
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Categoria
              <select
                value={form.category}
                onChange={(event) =>
                  handleChange("category", event.target.value)
                }
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-2 text-sm focus:border-slate-400 focus:outline-none"
              >
                <option value="">Sem categoria</option>
                {CATEGORY_OPTIONS.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium text-slate-700">
              Loja
              <input
                type="text"
                value={form.store_name}
                onChange={(event) =>
                  handleChange("store_name", event.target.value)
                }
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-2 text-sm focus:border-slate-400 focus:outline-none"
              />
            </label>
          </div>
          <label className="text-sm font-medium text-slate-700">
            Imagens (carrossel)
            <div className="mt-2 flex flex-wrap gap-3">
              <div className="flex flex-1 gap-2">
                <input
                  type="url"
                  value={imageUrlInput}
                  onChange={(event) => setImageUrlInput(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm focus:border-slate-400 focus:outline-none"
                  placeholder="Cole a URL da imagem"
                />
                <button
                  type="button"
                  onClick={handleAddImageUrl}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                >
                  Adicionar
                </button>
              </div>
              <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-xs text-slate-600 transition hover:border-slate-300 hover:text-slate-900">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) {
                      void handleUploadImage(file);
                    }
                    event.currentTarget.value = "";
                  }}
                  disabled={uploading}
                />
                {uploading ? "Enviando..." : "Enviar arquivo"}
              </label>
            </div>
            {form.image_urls.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-3">
                {form.image_urls.map((url, index) => (
                  <div
                    key={`${url}-${index}`}
                    className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-2 py-2"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt="Imagem enviada"
                      className="h-12 w-12 rounded-xl object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(index)}
                      className="text-[11px] text-rose-600"
                    >
                      Remover
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-xs text-slate-500">
                Adicione uma ou mais imagens para o carrossel.
              </p>
            )}
          </label>
          <label className="text-sm font-medium text-slate-700">
            Link original
            <input
              type="url"
              value={form.origin_url}
              onChange={(event) =>
                handleChange("origin_url", event.target.value)
              }
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-2 text-sm focus:border-slate-400 focus:outline-none"
              required
            />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Link de afiliado
            <input
              type="url"
              value={form.affiliate_url}
              onChange={(event) =>
                handleChange("affiliate_url", event.target.value)
              }
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-2 text-sm focus:border-slate-400 focus:outline-none"
            />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Tags
            <input
              type="text"
              value={form.tags}
              onChange={(event) => handleChange("tags", event.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-2 text-sm focus:border-slate-400 focus:outline-none"
              placeholder="ex: tecnologia, gadgets"
            />
          </label>
          <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(event) =>
                handleChange("is_active", event.target.checked)
              }
              className="h-4 w-4 rounded border-slate-300 text-slate-900"
            />
            Publicar agora
          </label>
          <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 md:grid-cols-2">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={form.is_featured}
                onChange={(event) =>
                  handleChange("is_featured", event.target.checked)
                }
                className="h-4 w-4 rounded border-slate-300 text-slate-900"
              />
              Destaque da home
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={form.is_exclusive}
                onChange={(event) =>
                  handleChange("is_exclusive", event.target.checked)
                }
                className="h-4 w-4 rounded border-slate-300 text-slate-900"
              />
              Lista exclusiva
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={form.is_trending}
                onChange={(event) =>
                  handleChange("is_trending", event.target.checked)
                }
                className="h-4 w-4 rounded border-slate-300 text-slate-900"
              />
              Em alta / tendencia
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={form.is_hot}
                onChange={(event) =>
                  handleChange("is_hot", event.target.checked)
                }
                className="h-4 w-4 rounded border-slate-300 text-slate-900"
              />
              Mais procurados
            </label>
          </div>
          <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
            <p className="text-xs text-slate-500">
              Defina a ordem para cada lista (quanto menor, mais alto na home).
            </p>
            <div className="grid gap-3 md:grid-cols-4">
              <label className="text-sm font-medium text-slate-700">
                Ordem destaque
                <input
                  type="number"
                  min="0"
                  value={form.featured_rank}
                  onChange={(event) =>
                    handleChange("featured_rank", event.target.value)
                  }
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                />
              </label>
              <label className="text-sm font-medium text-slate-700">
                Ordem exclusiva
                <input
                  type="number"
                  min="0"
                  value={form.exclusive_rank}
                  onChange={(event) =>
                    handleChange("exclusive_rank", event.target.value)
                  }
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                />
              </label>
              <label className="text-sm font-medium text-slate-700">
                Ordem em alta
                <input
                  type="number"
                  min="0"
                  value={form.trending_rank}
                  onChange={(event) =>
                    handleChange("trending_rank", event.target.value)
                  }
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                />
              </label>
              <label className="text-sm font-medium text-slate-700">
                Ordem mais procurados
                <input
                  type="number"
                  min="0"
                  value={form.hot_rank}
                  onChange={(event) => handleChange("hot_rank", event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                />
              </label>
            </div>
          </div>
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
                ? "Atualizar produto"
                : "Criar produto"}
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Produtos cadastrados
            </h2>
            <p className="text-sm text-slate-500">
              Clique em editar para ajustar ou publicar.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Buscar produto"
              className="w-full min-w-[220px] rounded-full border border-slate-200 px-4 py-2 text-xs text-slate-600 focus:border-slate-400 focus:outline-none sm:w-auto"
            />
            <div className="flex flex-wrap items-center gap-2 rounded-full border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600">
              <button
                type="button"
                onClick={() => setStatusFilter("all")}
                className={`rounded-full px-3 py-1.5 transition ${
                  statusFilter === "all"
                    ? "bg-slate-900 text-white"
                    : "hover:bg-slate-100"
                }`}
              >
                Todos ({products.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("published")}
                className={`rounded-full px-3 py-1.5 transition ${
                  statusFilter === "published"
                    ? "bg-slate-900 text-white"
                    : "hover:bg-slate-100"
                }`}
              >
                Publicados ({publishedCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("draft")}
                className={`rounded-full px-3 py-1.5 transition ${
                  statusFilter === "draft"
                    ? "bg-slate-900 text-white"
                    : "hover:bg-slate-100"
                }`}
              >
                Rascunhos ({draftCount})
              </button>
              <button
                type="button"
                onClick={() =>
                  setCategoryFilter((prev) =>
                    prev === "uncategorized" ? "all" : "uncategorized"
                  )
                }
                className={`rounded-full px-3 py-1.5 transition ${
                  categoryFilter === "uncategorized"
                    ? "bg-amber-500 text-white"
                    : "hover:bg-slate-100"
                }`}
              >
                Sem categoria ({uncategorizedCount})
              </button>
            </div>
            <button
              type="button"
              onClick={handleSelectAll}
              className="rounded-full border border-slate-200 px-4 py-2 text-xs text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
            >
              Selecionar todos (visiveis)
            </button>
            <button
              type="button"
              onClick={handleClearSelectionVisible}
              className="rounded-full border border-slate-200 px-4 py-2 text-xs text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
            >
              Tirar selecao (visiveis)
            </button>
            <button
              type="button"
              onClick={handleClearFilters}
              className="rounded-full border border-slate-200 px-4 py-2 text-xs text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
            >
              Limpar filtros
            </button>
            <select
              value={bulkCategory}
              onChange={(event) => setBulkCategory(event.target.value)}
              className="rounded-full border border-slate-200 px-4 py-2 text-xs text-slate-600 focus:border-slate-400 focus:outline-none"
            >
              <option value="">Categoria em massa</option>
              {CATEGORY_OPTIONS.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleApplyCategorySelected}
              disabled={selectedIds.length === 0 || !bulkCategory || saving}
              className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:opacity-60"
            >
              Aplicar categoria ({selectedIds.length})
            </button>
            <button
              type="button"
              onClick={handlePublishSelected}
              disabled={selectedIds.length === 0 || saving}
              className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
            >
              Publicar selecionados ({selectedIds.length})
            </button>
            <button
              type="button"
              onClick={handleDeleteSelected}
              disabled={selectedIds.length === 0 || deleting}
              className="rounded-full border border-rose-200 px-4 py-2 text-xs font-semibold text-rose-600 transition hover:border-rose-300 hover:text-rose-700 disabled:opacity-60"
            >
              Excluir selecionados ({selectedIds.length})
            </button>
            <button
              type="button"
              onClick={fetchProducts}
              className="rounded-full border border-slate-200 px-4 py-2 text-xs text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
            >
              Atualizar lista
            </button>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          {loading ? (
            <p className="text-sm text-slate-500">Carregando produtos...</p>
          ) : null}
          {!loading && products.length === 0 ? (
            <p className="text-sm text-slate-500">
              Nenhum produto cadastrado ainda.
            </p>
          ) : null}
          {!loading && products.length > 0 && filteredProducts.length === 0 ? (
            <p className="text-sm text-slate-500">
              Nenhum produto neste filtro.
            </p>
          ) : null}
          {filteredProducts.map((product) => {
            const attention = needsAttention.has(product.id);
            const selected = selectedIds.includes(product.id);
            return (
              <div
                key={product.id}
                className={`rounded-2xl border px-4 py-4 transition ${
                  attention
                    ? "border-amber-300 bg-amber-50"
                    : "border-slate-200 bg-slate-50"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex flex-1 items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => handleToggleSelect(product.id)}
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-900"
                    />
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-semibold text-slate-900">
                          {product.title}
                        </h3>
                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] uppercase tracking-wide ${
                            product.is_active
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-slate-200 text-slate-600"
                          }`}
                        >
                          {product.is_active ? "Publicado" : "Rascunho"}
                        </span>
                        {attention ? (
                          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] uppercase tracking-wide text-amber-700">
                            Completar imagem/categoria
                          </span>
                        ) : null}
                        {selected ? (
                          <span className="rounded-full bg-slate-900 px-2.5 py-1 text-[11px] uppercase tracking-wide text-white">
                            Selecionado
                          </span>
                        ) : null}
                      </div>
                      <p className="text-sm text-slate-500">/p/{product.slug}</p>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                        {(product.tags ?? []).map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-white px-2 py-1"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleEdit(product)}
                      className="rounded-full border border-slate-200 px-4 py-2 text-xs text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(product.id)}
                      className="rounded-full border border-rose-200 px-4 py-2 text-xs text-rose-600 transition hover:border-rose-300 hover:text-rose-700"
                    >
                      Excluir
                    </button>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500">
                  <span>Preço: {product.price_text ?? "sem preço"}</span>
                  <span>Loja: {product.store_name ?? "-"}</span>
                  <span>Categoria: {product.category ?? "-"}</span>
                  <span>
                    Imagens:{" "}
                    {(product.image_urls?.length ?? 0) > 0
                      ? product.image_urls?.length
                      : product.image_url
                        ? 1
                        : 0}
                  </span>
                  {product.is_featured ? (
                    <span className="rounded-full bg-indigo-100 px-2 py-1 text-[10px] uppercase tracking-wide text-indigo-700">
                      destaque
                      {product.featured_rank !== null &&
                      product.featured_rank !== undefined
                        ? ` #${product.featured_rank}`
                        : ""}
                    </span>
                  ) : null}
                  {product.is_exclusive ? (
                    <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] uppercase tracking-wide text-amber-700">
                      exclusivo
                      {product.exclusive_rank !== null &&
                      product.exclusive_rank !== undefined
                        ? ` #${product.exclusive_rank}`
                        : ""}
                    </span>
                  ) : null}
                  {product.is_trending ? (
                    <span className="rounded-full bg-rose-100 px-2 py-1 text-[10px] uppercase tracking-wide text-rose-700">
                      em alta
                      {product.trending_rank !== null &&
                      product.trending_rank !== undefined
                        ? ` #${product.trending_rank}`
                        : ""}
                    </span>
                  ) : null}
                  {product.is_hot ? (
                    <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] uppercase tracking-wide text-emerald-700">
                      mais procurado
                      {product.hot_rank !== null && product.hot_rank !== undefined
                        ? ` #${product.hot_rank}`
                        : ""}
                    </span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
