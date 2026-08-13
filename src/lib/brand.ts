// Brand logo helpers. Ported from evwire-codes/src/lib/brand.ts, which BRAND.md
// names as the reference implementation. Live Brandfetch hotlink URLs with a
// monogram fallback and a deterministic per-brand accent.
const BF_CLIENT = "1idFMihXt782UOQoKMl";

/** Square brand icon for a tile. Light theme, since the tiles are white. */
export function brandLogoUrl(domain: string): string {
  if (!domain) return "";
  return `https://cdn.brandfetch.io/${domain}/w/128/h/128/theme/light/fallback/404?c=${BF_CLIENT}`;
}

// Deterministic per-brand accent for the tile glow. Same hues as BRAND.md section 2.
const ACCENTS = ["#1B9152", "#388ADD", "#D97706", "#7C5CDB", "#0E9BA4", "#DB5C8E"];
export function brandAccent(brand: string): string {
  let h = 0;
  for (let i = 0; i < brand.length; i++) h = (h * 31 + brand.charCodeAt(i)) >>> 0;
  return ACCENTS[h % ACCENTS.length];
}

/** 1 to 2 character monogram fallback when no logo renders. */
export function monogram(brand: string): string {
  const cleaned = brand.replace(/[^A-Za-z0-9 ]/g, "").trim();
  if (!cleaned) return "?";
  const parts = cleaned.split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

/**
 * Operator domains, only where the identity was actually confirmed through the
 * Brandfetch search index. An operator absent from this map gets a monogram,
 * which is always correct. A wrong domain here would render a real company's
 * logo against someone else's charging site, so guessing is not an option.
 *
 * Deliberately absent, with reasons:
 * - Victron Energy. The operator behind Texas Best Smokehouse shares its name
 *   with the Dutch power-electronics company. Brandfetch would resolve the Dutch
 *   one, which is a different business.
 * - Most of the hosts are single-location businesses with no brand record:
 *   AC Customs, Courtyard FBG TX, Genoa Golf Club, Island Center, Little
 *   General, Summer Fun Inc., Diamonds by Raymond Lee, City of Alpharetta.
 */
export const OPERATOR_DOMAIN: Record<string, string> = {
  "Francis Energy": "francisenergy.com",
  EVgo: "evgo.com",
};

export function operatorDomain(operator: string): string {
  return OPERATOR_DOMAIN[operator] ?? "";
}
