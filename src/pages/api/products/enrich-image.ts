import type { NextApiRequest, NextApiResponse } from "next";
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

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "GET") {
    return res.status(200).json({ status: "ok", method: "GET" });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "method_not_allowed" });
  }

  const admin = createAdminClient();
  if (!admin) {
    return res.status(500).json({ error: "missing_service_role" });
  }

  const { productId, originUrl } = req.body as {
    productId?: string;
    originUrl?: string;
  };

  if (!productId || !originUrl) {
    return res.status(400).json({ error: "invalid_payload" });
  }

  const { data: product, error: productError } = await admin
    .from("products")
    .select("image_url")
    .eq("id", productId)
    .single();

  if (productError) {
    return res.status(500).json({ error: productError.message });
  }

  if (product?.image_url) {
    return res.status(200).json({ status: "skipped" });
  }

  const htmlResponse = await fetch(originUrl, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
    },
  });

  if (!htmlResponse.ok) {
    return res.status(400).json({ error: "page_fetch_failed" });
  }

  const html = await htmlResponse.text();
  const ogImage = extractOgImage(html);
  if (!ogImage) {
    return res.status(404).json({ error: "og_image_not_found" });
  }

  const imageUrl = normalizeUrl(ogImage, originUrl);
  const imageResponse = await fetch(imageUrl);
  if (!imageResponse.ok) {
    return res.status(400).json({ error: "image_fetch_failed" });
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
  const filePath = `${productId}/${Date.now()}.${extension}`;

  const { error: uploadError } = await admin.storage
    .from(BUCKET)
    .upload(filePath, buffer, { contentType, upsert: true });

  if (uploadError) {
    return res.status(500).json({ error: uploadError.message });
  }

  const { data: publicData } = admin.storage
    .from(BUCKET)
    .getPublicUrl(filePath);

  const publicUrl = publicData.publicUrl;

  const { error: updateError } = await admin
    .from("products")
    .update({ image_url: publicUrl })
    .eq("id", productId);

  if (updateError) {
    return res.status(500).json({ error: updateError.message });
  }

  return res.status(200).json({ status: "ok", imageUrl: publicUrl });
}
