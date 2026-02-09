"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { slugify } from "@/lib/slugify";
import { isValidUrl } from "@/lib/validation";
import type { Product } from "@/lib/types";

type FormState = {
  id?: string;
  title: string;
  slug: string;
  description_short: string;
  price_text: string;
  image_url: string;
  origin_url: string;
  affiliate_url: string;
  tags: string;
  store_name: string;
  category: string;
  is_active: boolean;
};

const emptyForm: FormState = {
  title: "",
  slug: "",
  description_short: "",
  price_text: "",
  image_url: "",
  origin_url: "",
  affiliate_url: "",
  tags: "",
  store_name: "",
  category: "",
  is_active: false,
};

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isEditing = Boolean(form.id);

  const needsAttention = useMemo(() => {
    return new Set(
      products
        .filter(
          (product) =>
            !product.is_active &&
            product.external_id &&
            (!product.image_url || !product.category)
        )
        .map((product) => product.id)
    );
  }, [products]);

  const fetchProducts = async () => {
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
  };

  useEffect(() => {
    void fetchProducts();
  }, []);

  const handleChange = (
    field: keyof FormState,
    value: string | boolean
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setForm(emptyForm);
  };

  const validateForm = () => {
    const title = form.title.trim();
    const originUrl = form.origin_url.trim();

    if (!title) return "Título é obrigatório.";
    if (!originUrl) return "Link original é obrigatório.";
    if (!isValidUrl(originUrl)) return "Link original inválido.";
    if (form.affiliate_url && !isValidUrl(form.affiliate_url.trim())) {
      return "Link de afiliado inválido.";
    }
    if (form.image_url && !isValidUrl(form.image_url.trim())) {
      return "URL da imagem inválida.";
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
      setError("Slug inválido.");
      return;
    }

    const payload = {
      title: form.title.trim(),
      slug,
      description_short: form.description_short.trim() || null,
      price_text: form.price_text.trim() || null,
      image_url: form.image_url.trim() || null,
      origin_url: form.origin_url.trim(),
      affiliate_url: form.affiliate_url.trim() || null,
      tags: tagsArray,
      store_name: form.store_name.trim() || null,
      category: form.category.trim() || null,
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
        await fetchProducts();
      }
    }

    setSaving(false);
  };

  const handleEdit = (product: Product) => {
    setMessage(null);
    setError(null);
    setForm({
      id: product.id,
      title: product.title ?? "",
      slug: product.slug ?? "",
      description_short: product.description_short ?? "",
      price_text: product.price_text ?? "",
      image_url: product.image_url ?? "",
      origin_url: product.origin_url ?? "",
      affiliate_url: product.affiliate_url ?? "",
      tags: (product.tags ?? []).join(", "),
      store_name: product.store_name ?? "",
      category: product.category ?? "",
      is_active: product.is_active ?? false,
    });
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

  return (
    <div className="space-y-10">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              {isEditing ? "Editar produto" : "Novo produto"}
            </h2>
            <p className="text-sm text-slate-500">
              Preencha o mínimo para publicar. Tags separadas por vírgula.
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
              Título
              <input
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
            Descrição curta
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
              <input
                type="text"
                value={form.category}
                onChange={(event) =>
                  handleChange("category", event.target.value)
                }
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-2 text-sm focus:border-slate-400 focus:outline-none"
              />
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
            URL da imagem
            <input
              type="url"
              value={form.image_url}
              onChange={(event) => handleChange("image_url", event.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-2 text-sm focus:border-slate-400 focus:outline-none"
            />
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
          <button
            type="button"
            onClick={fetchProducts}
            className="rounded-full border border-slate-200 px-4 py-2 text-xs text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
          >
            Atualizar lista
          </button>
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
          {products.map((product) => {
            const attention = needsAttention.has(product.id);
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
                    </div>
                    <p className="text-sm text-slate-500">
                      /p/{product.slug}
                    </p>
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
                  <span>Loja: {product.store_name ?? "—"}</span>
                  <span>Categoria: {product.category ?? "—"}</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
