"use client";

import { useState } from "react";
import Papa from "papaparse";
import { supabase } from "@/lib/supabase/client";
import { isValidUrl } from "@/lib/validation";
import { slugify } from "@/lib/slugify";

const expectedHeader = [
  "Item Id",
  "Item Name",
  "Price",
  "Sales",
  "Shop Name",
  "Commission Rate",
  "Commission",
  "Product Link",
  "Offer Link",
];

type ImportRow = {
  line: number;
  external_id: string;
  title: string;
  price_text: string;
  store_name: string;
  origin_url: string;
  affiliate_url: string | null;
};

type ImportError = {
  line: number;
  message: string;
};

type ImportResult = {
  imported: number;
  updated: number;
  ignored: number;
  imagesFetched: number;
  errors: ImportError[];
};

function parseShopeeCsv(text: string) {
  const errors: ImportError[] = [];
  const rows: ImportRow[] = [];

  const cleanText = text.replace(/^\uFEFF/, "");
  const lines = cleanText.split(/\r?\n/).filter((line) => line.trim() !== "");

  if (lines.length === 0) {
    errors.push({ line: 0, message: "Arquivo vazio." });
    return { rows, errors };
  }

  const headerParse = Papa.parse<string[]>(lines[0].trim());
  const headerRow = headerParse.data?.[0] ?? [];
  const normalizedHeader = headerRow.map((value) => value.trim());

  const headerMatches =
    normalizedHeader.length === expectedHeader.length &&
    normalizedHeader.every(
      (value, index) =>
        value.toLowerCase() === expectedHeader[index].toLowerCase()
    );

  if (!headerMatches) {
    errors.push({
      line: 1,
      message: `Cabecalho invalido. Esperado: ${expectedHeader.join(", ")}`,
    });
    return { rows, errors };
  }

  const seenIds = new Set<string>();
  const parsePackedRow = (value: string) => {
    let cleaned = value.trim();
    if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
      cleaned = cleaned.slice(1, -1);
    }
    cleaned = cleaned.replace(/""/g, '"');
    return Papa.parse<string[]>(cleaned).data?.[0] ?? [];
  };

  lines.slice(1).forEach((rawLine, index) => {
    const lineNumber = index + 2;
    const trimmed = rawLine.trim();
    if (!trimmed) return;

    const parsedRaw = Papa.parse<string[]>(trimmed);
    const rawRow = parsedRaw.data?.[0] ?? [];
    let row: string[] = [];

    if (rawRow.length === expectedHeader.length) {
      const packed = rawRow.slice(1).every((value) => value === "");
      row = packed ? parsePackedRow(rawRow[0]) : rawRow;
    } else if (rawRow.length === 1) {
      row = parsePackedRow(rawRow[0]);
    } else if (
      rawRow.length > expectedHeader.length &&
      rawRow.slice(1).every((value) => value === "")
    ) {
      row = parsePackedRow(rawRow[0]);
    } else {
      row = rawRow;
    }

    if (row.length !== expectedHeader.length) {
      errors.push({
        line: lineNumber,
        message: `Colunas invalidas (esperado ${expectedHeader.length}).`,
      });
      return;
    }

    const [
      itemId,
      itemName,
      price,
      ,
      shopName,
      ,
      ,
      productLink,
      offerLink,
    ] = row.map((value) => value.trim());

    if (!itemId) {
      errors.push({ line: lineNumber, message: "Item Id ausente." });
      return;
    }
    if (!itemName) {
      errors.push({ line: lineNumber, message: "Item Name ausente." });
      return;
    }
    if (!price) {
      errors.push({ line: lineNumber, message: "Price ausente." });
      return;
    }
    if (!productLink) {
      errors.push({ line: lineNumber, message: "Product Link ausente." });
      return;
    }
    if (!isValidUrl(productLink)) {
      errors.push({ line: lineNumber, message: "Product Link invalido." });
      return;
    }
    if (offerLink && !isValidUrl(offerLink)) {
      errors.push({ line: lineNumber, message: "Offer Link invalido." });
      return;
    }
    if (seenIds.has(itemId)) {
      errors.push({
        line: lineNumber,
        message: "Item Id duplicado no arquivo.",
      });
      return;
    }
    seenIds.add(itemId);

    rows.push({
      line: lineNumber,
      external_id: itemId,
      title: itemName,
      price_text: price,
      store_name: shopName,
      origin_url: productLink,
      affiliate_url: offerLink || null,
    });
  });

  return { rows, errors };
}

export default function AdminImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [autoImages, setAutoImages] = useState(false);

  const handleImport = async () => {
    if (!file) return;
    setLoading(true);
    setResult(null);

    const text = await file.text();
    const { rows, errors } = parseShopeeCsv(text);

    if (rows.length === 0) {
      setResult({
        imported: 0,
        updated: 0,
        ignored: 0,
        imagesFetched: 0,
        errors,
      });
      setLoading(false);
      return;
    }

    const externalIds = rows.map((row) => row.external_id);
    const { data: existingRows, error: existingError } = await supabase
      .from("products")
      .select("id, external_id")
      .in("external_id", externalIds);

    if (existingError) {
      setResult({
        imported: 0,
        updated: 0,
        ignored: 0,
        imagesFetched: 0,
        errors: [...errors, { line: 0, message: existingError.message }],
      });
      setLoading(false);
      return;
    }

    const existingMap = new Map(
      (existingRows ?? []).map((row) => [row.external_id, row.id])
    );

    let imported = 0;
    let updated = 0;
    let ignored = 0;
    let imagesFetched = 0;

    for (const row of rows) {
      const existingId = existingMap.get(row.external_id);
      if (existingId) {
        const { error: updateError } = await supabase
          .from("products")
          .update({
            price_text: row.price_text,
            origin_url: row.origin_url,
            affiliate_url: row.affiliate_url,
          })
          .eq("id", existingId);

        if (updateError) {
          errors.push({ line: row.line, message: updateError.message });
        } else {
          updated += 1;
        }
        continue;
      }

      const baseSlug = slugify(row.title);
      const slug = baseSlug
        ? `${baseSlug}-${row.external_id}`
        : row.external_id;

      const { data: insertData, error: insertError } = await supabase
        .from("products")
        .insert({
          external_id: row.external_id,
          title: row.title,
          slug,
          description_short: null,
          price_text: row.price_text,
          image_url: null,
          image_urls: [],
          origin_url: row.origin_url,
          affiliate_url: row.affiliate_url,
          tags: ["shopee"],
          store_name: row.store_name || null,
          category: null,
          is_active: false,
        })
        .select("id")
        .single();

      if (insertError) {
        errors.push({ line: row.line, message: insertError.message });
        ignored += 1;
      } else {
        imported += 1;
        if (insertData?.id && autoImages) {
          try {
            const response = await fetch("/api/products/enrich-image", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                productId: insertData.id,
                originUrl: row.origin_url,
              }),
            });
            if (response.ok) {
              const payload = (await response.json()) as {
                status?: string;
                error?: string;
              };
              if (payload.status === "ok") {
                imagesFetched += 1;
              } else if (payload.error) {
                if (payload.error !== "og_image_not_found") {
                  errors.push({
                    line: row.line,
                    message: `Imagem: ${payload.error}`,
                  });
                }
              } else {
                errors.push({
                  line: row.line,
                  message: "Imagem: falha ao processar.",
                });
              }
            } else {
              errors.push({
                line: row.line,
                message: "Falha ao buscar imagem.",
              });
            }
          } catch {
            errors.push({
              line: row.line,
              message: "Falha ao buscar imagem.",
            });
          }
        }
      }
    }

    setResult({
      imported,
      updated,
      ignored,
      imagesFetched,
      errors,
    });
    setLoading(false);
  };

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Importar CSV da Shopee
          </h2>
          <p className="text-sm text-slate-500">
            O arquivo deve conter o cabecalho padrao e linhas encapsuladas em
            aspas.
          </p>
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <input
            type="file"
            accept=".csv"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            className="text-sm"
          />
          <label className="flex items-center gap-2 text-xs text-slate-600">
            <input
              type="checkbox"
              checked={autoImages}
              onChange={(event) => setAutoImages(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-slate-900"
            />
            Buscar imagens automaticamente (beta)
          </label>
          <button
            type="button"
            onClick={handleImport}
            disabled={!file || loading}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
          >
            {loading ? "Importando..." : "Importar"}
          </button>
        </div>
      </section>

      {result ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-base font-semibold text-slate-900">
            Resultado da importacao
          </h3>
          <div className="mt-4 grid gap-3 text-sm text-slate-600 md:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              Importados: {result.imported}
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              Atualizados: {result.updated}
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              Ignorados: {result.ignored}
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              Imagens salvas: {result.imagesFetched}
            </div>
          </div>
          {!autoImages ? (
            <p className="mt-4 text-xs text-slate-500">
              A busca automatica de imagens esta desativada. Adicione imagens
              manualmente no painel de produtos.
            </p>
          ) : null}
          {result.errors.length > 0 ? (
            <div className="mt-6">
              <h4 className="text-sm font-semibold text-slate-900">
                Erros por linha
              </h4>
              <ul className="mt-2 space-y-2 text-xs text-rose-600">
                {result.errors.map((err, index) => (
                  <li key={`${err.line}-${index}`}>
                    Linha {err.line}: {err.message}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="mt-6 text-sm text-emerald-600">
              Nenhum erro encontrado.
            </p>
          )}
        </section>
      ) : null}
    </div>
  );
}
