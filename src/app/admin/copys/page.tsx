"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { getOriginalPrice, parsePriceText } from "@/lib/pricing";
import { getProductImages } from "@/lib/images";
import { slugify } from "@/lib/slugify";
import { CATEGORY_OPTIONS } from "@/lib/categories";
import type { CopyVariant, Product } from "@/lib/types";

type LinkMode = "out" | "affiliate";
type CopyChannel = "whatsapp" | "instagram" | "stories";
type CopyTone = "direct" | "enthusiastic" | "premium";
type CopyUrgency = "low" | "medium" | "high";

const hooksByTone: Record<CopyTone, string[]> = {
  direct: [
    "Oferta do dia:",
    "Achado rápido:",
    "Preço especial:",
  ],
  enthusiastic: [
    "🔥 Achado imperdível:",
    "⚡ Promoção relâmpago:",
    "💥 Oferta que vale a pena:",
  ],
  premium: [
    "✨ Seleção especial:",
    "🌟 Destaque exclusivo:",
    "🏆 Curadoria premium:",
  ],
};

const benefitPool = [
  "✅ Ótimo custo-benefício",
  "✅ Destaque entre os mais procurados",
  "✅ Oferta selecionada do dia",
  "✅ Link rápido para conferir",
  "✅ Ideal para presentear",
  "✅ Produto em alta",
];

const urgencyLines: Record<CopyUrgency, string> = {
  low: "",
  medium: "⚡ Aproveite enquanto está disponível",
  high: "🔥 Corre porque pode acabar rápido",
};

const ctaTemplates: Record<CopyChannel, string[]> = {
  whatsapp: [
    "👉 Acesse a oferta: {link}",
    "🔗 Link direto: {link}",
    "🛒 Ver detalhes no link: {link}",
  ],
  instagram: [
    "🔗 Link na bio / direto: {link}",
    "👉 Confira aqui: {link}",
  ],
  stories: [
    "Arrasta para ver: {link}",
    "Link aqui: {link}",
  ],
};

const emojiTags: { keys: string[]; emoji: string }[] = [
  { keys: ["tech", "gadget", "eletr"], emoji: "⚡" },
  { keys: ["casa", "home", "decor"], emoji: "🏠" },
  { keys: ["beleza", "skin", "make"], emoji: "💄" },
  { keys: ["fitness", "treino", "saude"], emoji: "💪" },
  { keys: ["moda", "roupa", "look"], emoji: "👗" },
  { keys: ["pet", "animal"], emoji: "🐾" },
  { keys: ["kids", "crianca", "infantil"], emoji: "🧸" },
  { keys: ["cozinha", "gourmet"], emoji: "🍳" },
  { keys: ["audio", "som", "fone"], emoji: "🎧" },
];

const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");

function buildInternalLink(path: string) {
  return baseUrl ? `${baseUrl}${path}` : path;
}

function hashSeed(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function pickFrom(list: string[], seed: string, offset = 0) {
  if (list.length === 0) return "";
  const index = (hashSeed(seed) + offset) % list.length;
  return list[index];
}

function getEmoji(product: Product) {
  const tokens = [
    product.category ?? "",
    ...(product.tags ?? []),
    product.title ?? "",
  ]
    .join(" ")
    .toLowerCase();

  for (const item of emojiTags) {
    if (item.keys.some((key) => tokens.includes(key))) return item.emoji;
  }
  return "✨";
}

function buildPriceHighlight(product: Product, channel: CopyChannel) {
  if (!product.price_text) return "";
  const original = getOriginalPrice(product.price_text, product.slug);
  if (!original) return product.price_text;

  const originalValue = parsePriceText(original);
  const currentValue = parsePriceText(product.price_text);
  const percent =
    originalValue && currentValue
      ? Math.round(((originalValue - currentValue) / originalValue) * 100)
      : null;

  if (channel === "whatsapp") {
    return percent
      ? `~De ${original}~ por ${product.price_text} (${percent}% OFF)`
      : `~De ${original}~ por ${product.price_text}`;
  }

  return percent
    ? `De ${original} por ${product.price_text} (${percent}% OFF)`
    : `De ${original} por ${product.price_text}`;
}

function buildHashtags(product: Product) {
  const tags = (product.tags ?? []).map((tag) => slugify(tag));
  const category = product.category ? slugify(product.category) : "";
  const list = [category, ...tags]
    .filter(Boolean)
    .map((tag) => `#${tag}`);
  const unique = Array.from(new Set(list));
  return unique.slice(0, 6).join(" ");
}

function buildCopies(
  product: Product,
  linkMode: LinkMode,
  channel: CopyChannel,
  tone: CopyTone,
  urgency: CopyUrgency
): CopyVariant[] {
  let link = "";

  if (linkMode === "affiliate") {
    link = product.affiliate_url || product.origin_url || "";
  } else {
    link = buildInternalLink(`/out/${product.slug}?src=whats&camp=default`);
  }

  if (!link) {
    link = buildInternalLink(`/out/${product.slug}?src=whats&camp=default`);
  }

  const emoji = getEmoji(product);
  const baseSeed = `${product.slug}-${tone}-${urgency}-${channel}`;
  const hookList = hooksByTone[tone];
  const urgencyLine = urgencyLines[urgency];

  const safeTag =
    (product.tags ?? []).find(
      (tag) => tag && tag.toLowerCase() !== "shopee"
    ) ?? "";
  const tagHint = product.category
    ? `✅ Categoria: ${product.category}`
    : safeTag
      ? `✅ Categoria: ${safeTag}`
      : "";

  const benefit1 = tagHint || pickFrom(benefitPool, baseSeed, 1);
  const benefit2 = pickFrom(benefitPool, baseSeed, 2);
  const priceHighlight = buildPriceHighlight(product, channel);
  const hashtags = buildHashtags(product);

  const buildCta = (seedOffset: number) => {
    const template = pickFrom(ctaTemplates[channel], baseSeed, seedOffset);
    return template.replace("{link}", link);
  };

  const variants: CopyVariant[] = [];

  if (channel === "whatsapp") {
    for (let index = 0; index < 3; index += 1) {
      const hook = pickFrom(hookList, baseSeed, index);
      const lines = [
        `${emoji} ${hook} ${product.title}`,
        benefit1,
        benefit2,
        priceHighlight || product.price_text || "",
        urgencyLine,
        buildCta(index),
      ].filter(Boolean);

      variants.push({
        variant: `whatsapp-${index + 1}`,
        content: lines.join("\n"),
      });
    }
  }

  if (channel === "instagram") {
    for (let index = 0; index < 2; index += 1) {
      const hook = pickFrom(hookList, baseSeed, index + 3);
      const lines = [
        `${emoji} ${hook} ${product.title}`,
        benefit1,
        benefit2,
        priceHighlight || product.price_text || "",
        urgencyLine,
        buildCta(index),
        hashtags,
      ].filter(Boolean);

      variants.push({
        variant: `instagram-${index + 1}`,
        content: lines.join("\n"),
      });
    }
  }

  if (channel === "stories") {
    const hook = pickFrom(hookList, baseSeed, 5);
    const lines = [
      `${emoji} ${hook}`,
      product.title,
      priceHighlight || product.price_text || "",
      urgencyLine,
      buildCta(0),
    ].filter(Boolean);

    variants.push({
      variant: "stories-1",
      content: lines.join("\n"),
    });
  }

  const shortLines = [
    `${emoji} ${product.title}${priceHighlight ? ` • ${priceHighlight}` : ""}`,
    buildCta(3),
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
  const [linkMode, setLinkMode] = useState<LinkMode>("out");
  const [channel, setChannel] = useState<CopyChannel>("whatsapp");
  const [tone, setTone] = useState<CopyTone>("enthusiastic");
  const [urgency, setUrgency] = useState<CopyUrgency>("medium");
  const [filter, setFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const filteredProducts = useMemo(() => {
    const term = filter.trim().toLowerCase();
    return products.filter((product) => {
      const matchesTerm = term
        ? product.title.toLowerCase().includes(term)
        : true;
      const matchesCategory =
        categoryFilter === "all"
          ? true
          : (product.category ?? "") === categoryFilter;
      return matchesTerm && matchesCategory;
    });
  }, [products, filter, categoryFilter]);

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === selectedId) ?? null,
    [products, selectedId]
  );

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    const { data, error: fetchError } = await supabase
      .from("products")
      .select(
        "id, title, slug, price_text, is_active, affiliate_url, origin_url, image_url, image_urls, tags, category"
      )
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
  }, [selectedId]);

  useEffect(() => {
    void fetchProducts();
  }, [fetchProducts]);

  const handleGenerate = async () => {
    if (!selectedProduct) return;
    setMessage(null);
    setError(null);

    const generated = buildCopies(selectedProduct, linkMode, channel, tone, urgency);
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

  const showDraftWarning =
    selectedProduct && !selectedProduct.is_active && linkMode === "out";

  const showAffiliateWarning =
    selectedProduct && linkMode === "affiliate" && !selectedProduct.affiliate_url;

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Gerador de copys
            </h2>
            <p className="text-sm text-slate-500">
              Selecione um produto e personalize tom, canal e urgência.
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
          <div className="mt-6 grid gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="text"
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
                placeholder="Buscar produto"
                className="min-w-[220px] flex-1 rounded-xl border border-slate-200 px-4 py-2 text-sm focus:border-slate-400 focus:outline-none"
              />
              <select
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
                className="min-w-[200px] rounded-xl border border-slate-200 px-4 py-2 text-sm focus:border-slate-400 focus:outline-none"
              >
                <option value="all">Todas as categorias</option>
                {CATEGORY_OPTIONS.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
              <select
                value={linkMode}
                onChange={(event) => setLinkMode(event.target.value as LinkMode)}
                className="min-w-[200px] rounded-xl border border-slate-200 px-4 py-2 text-sm focus:border-slate-400 focus:outline-none"
              >
                <option value="out">Link com tracking (/out)</option>
                <option value="affiliate">Link direto afiliado</option>
              </select>
              <select
                value={channel}
                onChange={(event) => setChannel(event.target.value as CopyChannel)}
                className="min-w-[160px] rounded-xl border border-slate-200 px-4 py-2 text-sm focus:border-slate-400 focus:outline-none"
              >
                <option value="whatsapp">WhatsApp</option>
                <option value="instagram">Instagram</option>
                <option value="stories">Stories</option>
              </select>
              <select
                value={tone}
                onChange={(event) => setTone(event.target.value as CopyTone)}
                className="min-w-[180px] rounded-xl border border-slate-200 px-4 py-2 text-sm focus:border-slate-400 focus:outline-none"
              >
                <option value="enthusiastic">Tom entusiasmado</option>
                <option value="direct">Tom direto</option>
                <option value="premium">Tom premium</option>
              </select>
              <select
                value={urgency}
                onChange={(event) => setUrgency(event.target.value as CopyUrgency)}
                className="min-w-[170px] rounded-xl border border-slate-200 px-4 py-2 text-sm focus:border-slate-400 focus:outline-none"
              >
                <option value="low">Urgência baixa</option>
                <option value="medium">Urgência média</option>
                <option value="high">Urgência alta</option>
              </select>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={!selectedProduct || saving}
                className="rounded-xl bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
              >
                {saving ? "Gerando..." : "Gerar copys"}
              </button>
            </div>

            <div className="max-h-72 space-y-2 overflow-auto pr-2">
              {filteredProducts.length === 0 ? (
                <p className="text-sm text-slate-500">Nenhum produto encontrado.</p>
              ) : (
                filteredProducts.map((product) => {
                  const images = getProductImages(product);
                  const selected = product.id === selectedId;
                  return (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => setSelectedId(product.id)}
                      className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-2 text-left transition ${
                        selected
                          ? "border-slate-900 bg-slate-900/5"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
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
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-slate-900">
                          {product.title}
                        </p>
                        <p className="text-xs text-slate-500">
                          {product.price_text || "sem preço"}
                        </p>
                      </div>
                      {!product.is_active ? (
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] uppercase tracking-wide text-slate-500">
                          rascunho
                        </span>
                      ) : null}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}

        {showDraftWarning ? (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-700">
            Produto em rascunho. Publique para o link funcionar.
          </div>
        ) : null}
        {showAffiliateWarning ? (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-700">
            Sem link de afiliado. Usando link original.
          </div>
        ) : null}
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
