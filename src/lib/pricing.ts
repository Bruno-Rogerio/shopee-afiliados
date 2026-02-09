const bumps = [0.05, 0.1, 0.15, 0.2, 0.25];

function hashSeed(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function parsePriceText(priceText: string) {
  const normalized = priceText
    .replace(/[^\d,.-]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

export function formatPrice(value: number) {
  return `R$ ${value.toFixed(2).replace(".", ",")}`;
}

export function getOriginalPrice(priceText: string, seed: string) {
  const parsed = parsePriceText(priceText);
  if (parsed === null) return null;
  const bump = bumps[hashSeed(seed) % bumps.length];
  const original = parsed * (1 + bump);
  return formatPrice(original);
}
