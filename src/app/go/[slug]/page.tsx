import Link from "next/link";
import { notFound } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import type { Product } from "@/lib/types";

export const revalidate = 60;

type PageProps = {
  params: { slug: string };
  searchParams?: { src?: string; camp?: string };
};

function buildOutUrl(slug: string, src?: string, camp?: string) {
  const params = new URLSearchParams();
  if (src) params.set("src", src);
  if (camp) params.set("camp", camp);
  const query = params.toString();
  return query ? `/out/${slug}?${query}` : `/out/${slug}`;
}

export default async function GoPage({ params, searchParams }: PageProps) {
  const supabase = createServerClient();
  const { data } = supabase
    ? await supabase
        .from("products")
        .select("title, price_text, image_url, is_active, slug")
        .eq("slug", params.slug)
        .eq("is_active", true)
        .single()
    : { data: null };

  if (!data) {
    notFound();
  }

  const product = data as Product;
  const outUrl = buildOutUrl(
    product.slug,
    searchParams?.src,
    searchParams?.camp
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 px-6 py-10">
      <div className="mx-auto w-full max-w-2xl">
        <div className="rounded-3xl border border-white/70 bg-white/80 p-8 shadow-lg backdrop-blur">
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-4">
              <div className="relative h-20 w-20 overflow-hidden rounded-2xl bg-slate-100">
                {product.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={product.image_url}
                    alt={product.title}
                    className="h-full w-full object-cover"
                  />
                ) : null}
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-slate-400">
                  Escolha seu caminho
                </p>
                <h1 className="text-2xl font-semibold text-slate-900">
                  {product.title}
                </h1>
                <p className="text-sm text-slate-500">
                  {product.price_text || "Consulte o preco"}
                </p>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <Link
                href="/"
                className="rounded-2xl border border-slate-200 px-5 py-4 text-center text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
              >
                Ver catalogo completo
              </Link>
              <Link
                href={outUrl}
                className="rounded-2xl bg-slate-900 px-5 py-4 text-center text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Ir para o produto na Shopee
              </Link>
            </div>

            <p className="text-xs text-slate-500">
              Ao sair, registramos o clique para acompanhar resultados.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
