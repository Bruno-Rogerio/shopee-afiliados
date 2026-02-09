import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "product-images";

function extractOgImage(html: string) {
  const metaTagMatch =
    html.match(/<meta[^>]+property=["']og:image["'][^>]*>/i) ??
    html.match(/<meta[^>]+name=["']og:image["'][^>]*>/i);

  if (!metaTagMatch) return null;

  const contentMatch = metaTagMatch[0].match(/content=["']([^"']+)["']/i);
  return contentMatch?.[1] ?? null;
}

function normalizeUrl(rawUrl: string, baseUrl: string) {
  if (rawUrl.startsWith("//")) {
    return `https:${rawUrl}`;
  }
  if (rawUrl.startsWith("/")) {
    return new URL(rawUrl, baseUrl).toString();
  }
  return rawUrl;
}

export async function POST(request: NextRequest) {
  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: "missing_service_role" },
      { status: 500 }
    );
  }

  const body = (await request.json()) as {
    productId?: string;
    originUrl?: string;
  };

  if (!body.productId || !body.originUrl) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const { data: product, error: productError } = await admin
    .from("products")
    .select("image_url")
    .eq("id", body.productId)
    .single();

  if (productError) {
    return NextResponse.json({ error: productError.message }, { status: 500 });
  }

  if (product?.image_url) {
    return NextResponse.json({ status: "skipped" });
  }

  const htmlResponse = await fetch(body.originUrl, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
    },
  });

  if (!htmlResponse.ok) {
    return NextResponse.json(
      { error: "page_fetch_failed" },
      { status: 400 }
    );
  }

  const html = await htmlResponse.text();
  const ogImage = extractOgImage(html);
  if (!ogImage) {
    return NextResponse.json({ error: "og_image_not_found" }, { status: 404 });
  }

  const imageUrl = normalizeUrl(ogImage, body.originUrl);
  const imageResponse = await fetch(imageUrl);
  if (!imageResponse.ok) {
    return NextResponse.json(
      { error: "image_fetch_failed" },
      { status: 400 }
    );
  }

  const contentType =
    imageResponse.headers.get("content-type") ?? "image/jpeg";
  const extension = contentType.includes("png")
    ? "png"
    : contentType.includes("webp")
      ? "webp"
      : contentType.includes("gif")
        ? "gif"
        : "jpg";

  const buffer = Buffer.from(await imageResponse.arrayBuffer());
  const filePath = `${body.productId}/${Date.now()}.${extension}`;

  const { error: uploadError } = await admin.storage
    .from(BUCKET)
    .upload(filePath, buffer, { contentType, upsert: true });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: publicData } = admin.storage
    .from(BUCKET)
    .getPublicUrl(filePath);

  const publicUrl = publicData.publicUrl;

  const { error: updateError } = await admin
    .from("products")
    .update({ image_url: publicUrl })
    .eq("id", body.productId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ status: "ok", imageUrl: publicUrl });
}
