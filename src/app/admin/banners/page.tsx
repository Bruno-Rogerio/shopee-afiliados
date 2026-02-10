"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { isValidUrl } from "@/lib/validation";
import type { HomeBanner } from "@/lib/types";

type BannerFormState = {
  id?: string;
  title: string;
  subtitle: string;
  badge: string;
  cta_label: string;
  cta_url: string;
  theme: string;
  is_active: boolean;
};

const themes = [
  { value: "amber", label: "Âmbar" },
  { value: "indigo", label: "Índigo" },
  { value: "emerald", label: "Esmeralda" },
  { value: "rose", label: "Rosa" },
  { value: "slate", label: "Neutro" },
];

const emptyForm: BannerFormState = {
  title: "",
  subtitle: "",
  badge: "",
  cta_label: "",
  cta_url: "",
  theme: "slate",
  is_active: true,
};

export default function AdminBannersPage() {
  const [banners, setBanners] = useState<HomeBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<BannerFormState>(emptyForm);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isEditing = Boolean(form.id);

  const fetchBanners = useCallback(async () => {
    setLoading(true);
    const { data, error: fetchError } = await supabase
      .from("home_banners")
      .select("*")
      .order("sort_order", { ascending: true });

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setBanners((data ?? []) as HomeBanner[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchBanners();
  }, [fetchBanners]);

  const handleChange = (
    field: keyof BannerFormState,
    value: string | boolean
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setForm(emptyForm);
  };

  const validateForm = () => {
    if (!form.title.trim()) return "Título é obrigatório.";
    if (form.cta_url.trim() && !isValidUrl(form.cta_url.trim()) && !form.cta_url.startsWith("/")) {
      return "CTA deve ser uma URL válida ou caminho interno (/c, /listas).";
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

    setSaving(true);

    const payload = {
      title: form.title.trim(),
      subtitle: form.subtitle.trim() || null,
      badge: form.badge.trim() || null,
      cta_label: form.cta_label.trim() || null,
      cta_url: form.cta_url.trim() || null,
      theme: form.theme,
      is_active: form.is_active,
    };

    if (isEditing && form.id) {
      const { error: updateError } = await supabase
        .from("home_banners")
        .update(payload)
        .eq("id", form.id);

      if (updateError) {
        setError(updateError.message);
      } else {
        setMessage("Banner atualizado.");
        resetForm();
        await fetchBanners();
      }
    } else {
      const nextOrder = banners.length + 1;
      const { error: insertError } = await supabase
        .from("home_banners")
        .insert({ ...payload, sort_order: nextOrder });

      if (insertError) {
        setError(insertError.message);
      } else {
        setMessage("Banner criado.");
        resetForm();
        await fetchBanners();
      }
    }

    setSaving(false);
  };

  const handleEdit = (banner: HomeBanner) => {
    setForm({
      id: banner.id,
      title: banner.title ?? "",
      subtitle: banner.subtitle ?? "",
      badge: banner.badge ?? "",
      cta_label: banner.cta_label ?? "",
      cta_url: banner.cta_url ?? "",
      theme: banner.theme ?? "slate",
      is_active: banner.is_active ?? true,
    });
  };

  const handleDelete = async (bannerId: string) => {
    const confirmed = window.confirm("Deseja remover este banner?");
    if (!confirmed) return;

    const { error: deleteError } = await supabase
      .from("home_banners")
      .delete()
      .eq("id", bannerId);

    if (deleteError) {
      setError(deleteError.message);
    } else {
      setMessage("Banner removido.");
      await fetchBanners();
    }
  };

  const handleMove = async (index: number, direction: number) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= banners.length) return;

    const next = [...banners];
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    const updates = next.map((banner, idx) => ({
      id: banner.id,
      sort_order: idx + 1,
    }));

    setSaving(true);
    const { error: updateError } = await supabase
      .from("home_banners")
      .upsert(updates, { onConflict: "id" });

    if (updateError) {
      setError(updateError.message);
    } else {
      setBanners(
        next.map((banner, idx) => ({
          ...banner,
          sort_order: idx + 1,
        }))
      );
    }
    setSaving(false);
  };

  const preview = useMemo(() => {
    const theme = themes.find((item) => item.value === form.theme) ?? themes[4];
    return `${form.title || "Título"} · ${theme.label}`;
  }, [form.title, form.theme]);

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              {isEditing ? "Editar banner" : "Novo banner"}
            </h2>
            <p className="text-sm text-slate-500">
              Banners aparecem no topo da home, logo após o hero.
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
              Badge
              <input
                type="text"
                value={form.badge}
                onChange={(event) => handleChange("badge", event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-2 text-sm focus:border-slate-400 focus:outline-none"
                placeholder="Ex: HOJE, TOP"
              />
            </label>
          </div>
          <label className="text-sm font-medium text-slate-700">
            Subtítulo
            <textarea
              value={form.subtitle}
              onChange={(event) => handleChange("subtitle", event.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-2 text-sm focus:border-slate-400 focus:outline-none"
              rows={3}
            />
          </label>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-medium text-slate-700">
              CTA (texto)
              <input
                type="text"
                value={form.cta_label}
                onChange={(event) => handleChange("cta_label", event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-2 text-sm focus:border-slate-400 focus:outline-none"
                placeholder="Ex: Ver ofertas"
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              CTA (link)
              <input
                type="text"
                value={form.cta_url}
                onChange={(event) => handleChange("cta_url", event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-2 text-sm focus:border-slate-400 focus:outline-none"
                placeholder="https:// ou /listas"
              />
            </label>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-medium text-slate-700">
              Tema
              <select
                value={form.theme}
                onChange={(event) => handleChange("theme", event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-2 text-sm focus:border-slate-400 focus:outline-none"
              >
                {themes.map((theme) => (
                  <option key={theme.value} value={theme.value}>
                    {theme.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(event) => handleChange("is_active", event.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-slate-900"
              />
              Banner ativo
            </label>
          </div>
          <p className="text-xs text-slate-400">Preview: {preview}</p>
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
                ? "Atualizar banner"
                : "Criar banner"}
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Banners</h2>
            <p className="text-sm text-slate-500">
              Ordene com as setas para mudar a sequência na home.
            </p>
          </div>
          <button
            type="button"
            onClick={fetchBanners}
            className="rounded-full border border-slate-200 px-4 py-2 text-xs text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
          >
            Atualizar
          </button>
        </div>

        <div className="mt-6 space-y-3">
          {loading ? (
            <p className="text-sm text-slate-500">Carregando banners...</p>
          ) : null}
          {!loading && banners.length === 0 ? (
            <p className="text-sm text-slate-500">
              Nenhum banner criado ainda.
            </p>
          ) : null}
          {banners.map((banner, index) => (
            <div
              key={banner.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-semibold text-slate-900">
                    {banner.title}
                  </h3>
                  {banner.is_active ? (
                    <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] uppercase tracking-wide text-emerald-700">
                      ativo
                    </span>
                  ) : (
                    <span className="rounded-full bg-slate-200 px-2.5 py-1 text-[11px] uppercase tracking-wide text-slate-600">
                      pausado
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500">
                  {banner.subtitle || "Sem subtítulo"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleMove(index, -1)}
                  disabled={saving || index === 0}
                  className="rounded-full border border-slate-200 px-2.5 py-1 text-xs text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:opacity-40"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => handleMove(index, 1)}
                  disabled={saving || index === banners.length - 1}
                  className="rounded-full border border-slate-200 px-2.5 py-1 text-xs text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:opacity-40"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => handleEdit(banner)}
                  className="rounded-full border border-slate-200 px-3 py-1.5 text-xs text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                >
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(banner.id)}
                  className="rounded-full border border-rose-200 px-3 py-1.5 text-xs text-rose-600 transition hover:border-rose-300 hover:text-rose-700"
                >
                  Excluir
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
