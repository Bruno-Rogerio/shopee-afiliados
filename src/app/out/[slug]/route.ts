import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { resolveProductUrl } from "@/lib/linkResolver";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;
  const supabase = createServerClient();
  if (!supabase) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const { data } = await supabase
    .from("products")
    .select("id, slug, origin_url, affiliate_url, is_active")
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  if (!data) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const url = resolveProductUrl({
    affiliate_url: data.affiliate_url,
    origin_url: data.origin_url,
  });

  const { searchParams } = new URL(request.url);
  const src = searchParams.get("src");
  const camp = searchParams.get("camp");
  const ua = request.headers.get("user-agent") ?? null;

  await supabase.from("outbound_clicks").insert({
    product_id: data.id,
    src,
    camp,
    ua,
  });

  return NextResponse.redirect(url, { status: 302 });
}
