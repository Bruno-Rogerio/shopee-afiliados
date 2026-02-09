"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import type { CopyVariant, Product } from "@/lib/types";

const hooks = [
  "Achado do dia:",
  "Oferta relâmpago:",
  "Promoção que vale agora:",
];

const benefitSets = [
  ["✅ Ótimo custo-benefício", "✅ Ideal para o dia a dia"],
  ["✅ Estoque limitado", "✅ Compra rápida e segura"],
  ["✅ Produto bem avaliado", "✅ Prático e funcional"],
];

function buildCopies(product: Product): CopyVariant[] {
  const link = `/out/${product.slug}?src=whats&camp=default`;
  const priceLine = product.price_text ? product.price_text : "";

  const variants = hooks.slice(0, 3).map((hook, index) => {
    const benefits = benefitSets[index] ?? benefitSets[0];
    const lines = [
      `${hook} ${product.title}`,
      benefits[0],
      benefits[1],
      priceLine,
      `Chama no link: ${link}`,
    ].filter(Boolean);

    return {
      variant: `whatsapp-${index + 1}`,
      content: lines.join("\n"),
    };
  });

  const shortLines = [
    `${product.title}${priceLine ? ` • ${priceLine}` : ""}`,
    `Link direto: ${link}`,
  ];

  variants.push({
    variant: "short",
    content: shortLines.join("\n"),
  });

  return variants;
}

export default function AdminCopysPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [copies, setCopies] = useState<CopyVariant[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === selectedId) ?? null,
    [products, selectedId]
  );

  const fetchProducts = async () => {
    setLoading(true);
    const { data, error: fetchError } = await supabase
      .from("products")
      .select("id, title, slug, price_text, is_active")
      .order("created_at", { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setProducts((data ?? []) as Product[]);
      if (!selectedId && data && data.length > 0) {
        setSelectedId(data[0].id);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    void fetchProducts();
  }, []);

  const handleGenerate = async () => {
    if (!selectedProduct) return;
    setMessage(null);
    setError(null);

    const generated = buildCopies(selectedProduct);
    setCopies(generated);

    setSaving(true);
    const { error: insertError } = await supabase
      .from("product_copies")
      .insert(
        generated.map((copy) => ({
          product_id: selectedProduct.id,
          variant: copy.variant,
          content: copy.content,
        }))
      );

    if (insertError) {
      setError(insertError.message);
    } else {
      setMessage("Copys geradas e salvas.");
    }
    setSaving(false);
  };

  const handleCopy = async (content: string) => {
    await navigator.clipboard.writeText(content);
    setMessage("Copiado para a área de transferência.");
  };

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Gerador de copys
            </h2>
            <p className="text-sm text-slate-500">
              Selecione um produto e gere 3 variações WhatsApp + 1 curta.
            </p>
          </div>
          <button
            type="button"
            onClick={fetchProducts}
            className="rounded-full border border-slate-200 px-4 py-2 text-xs text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
          >
            Atualizar produtos
          </button>
        </div>

        {loading ? (
          <p className="mt-6 text-sm text-slate-500">Carregando produtos...</p>
        ) : (
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <select
              value={selectedId}
              onChange={(event) => setSelectedId(event.target.value)}
              className="min-w-[260px] rounded-xl border border-slate-200 px-4 py-2 text-sm focus:border-slate-400 focus:outline-none"
            >
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.title} {product.is_active ? "" : "(rascunho)"}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={!selectedProduct || saving}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
            >
              {saving ? "Gerando..." : "Gerar copys"}
            </button>
          </div>
        )}

        {message ? (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs text-emerald-700">
            {message}
          </div>
        ) : null}
        {error ? (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs text-rose-700">
            {error}
          </div>
        ) : null}
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {copies.map((copy) => (
          <div
            key={copy.variant}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">
                {copy.variant.toUpperCase()}
              </h3>
              <button
                type="button"
                onClick={() => handleCopy(copy.content)}
                className="rounded-full border border-slate-200 px-3 py-1.5 text-xs text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
              >
                Copiar
              </button>
            </div>
            <pre className="mt-4 whitespace-pre-wrap text-sm text-slate-700">
              {copy.content}
            </pre>
          </div>
        ))}
      </section>
    </div>
  );
}
