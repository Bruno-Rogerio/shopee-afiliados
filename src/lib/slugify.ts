export function slugify(value: string) {
  if (value === null || value === undefined) return "";
  const text = typeof value === "string" ? value : String(value);
  const trimmed = text.trim();
  if (!trimmed) return "";

  try {
    return trimmed
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80);
  } catch {
    return trimmed
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80);
  }
}
