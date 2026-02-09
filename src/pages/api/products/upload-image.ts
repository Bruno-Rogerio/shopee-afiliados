import type { NextApiRequest, NextApiResponse } from "next";
import { createAdminClient } from "@/lib/supabase/admin";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "10mb",
    },
  },
};

const BUCKET = "product-images";

function parseDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:(.+);base64,(.+)$/);
  if (!match) return null;
  return { contentType: match[1], data: match[2] };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "method_not_allowed" });
  }

  const admin = createAdminClient();
  if (!admin) {
    return res.status(500).json({ error: "missing_service_role" });
  }

  const { dataUrl, fileName } = req.body as {
    dataUrl?: string;
    fileName?: string;
  };

  if (!dataUrl || !fileName) {
    return res.status(400).json({ error: "invalid_payload" });
  }

  const parsed = parseDataUrl(dataUrl);
  if (!parsed) {
    return res.status(400).json({ error: "invalid_data_url" });
  }

  const { contentType, data } = parsed;
  const extension = contentType.includes("png")
    ? "png"
    : contentType.includes("webp")
      ? "webp"
      : contentType.includes("gif")
        ? "gif"
        : "jpg";

  const buffer = Buffer.from(data, "base64");
  const safeName = fileName.replace(/[^a-zA-Z0-9_.-]/g, "_");
  const filePath = `manual/${crypto.randomUUID()}-${safeName}.${extension}`;

  const { error: uploadError } = await admin.storage
    .from(BUCKET)
    .upload(filePath, buffer, { contentType, upsert: true });

  if (uploadError) {
    return res.status(500).json({ error: uploadError.message });
  }

  const { data: publicData } = admin.storage
    .from(BUCKET)
    .getPublicUrl(filePath);

  return res.status(200).json({ url: publicData.publicUrl });
}
