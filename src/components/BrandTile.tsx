"use client";

import { brandLogoUrl, brandAccent, monogram, operatorDomain } from "@/lib/brand";

/**
 * White tile carrying a third-party logo, per BRAND.md section 6, with a
 * monogram fallback and a deterministic accent glow.
 *
 * The logo URL carries `fallback/404`, so Brandfetch returns a 404 rather than a
 * placeholder when it has nothing. The monogram sits underneath, but revealing it
 * takes an onError: Chromium paints its broken-image glyph over a failed img,
 * which reads as a bug in the tile rather than as a missing logo. That is a
 * client component's worth of JavaScript for one attribute, and it is worth it,
 * because the same mistake was shipped on the map markers and had to be found in
 * a screenshot.
 */
export default function BrandTile({ operator }: { operator: string }) {
  const domain = operatorDomain(operator);
  const accent = brandAccent(operator);

  return (
    <span
      className="brandtile"
      aria-hidden="true"
      style={{ boxShadow: `inset 0 0 0 1px var(--hairline), 0 2px 10px -4px ${accent}66` }}
    >
      <span className="mono-fallback" style={{ color: accent, position: domain ? "absolute" : "static" }}>
        {monogram(operator)}
      </span>
      {domain && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={brandLogoUrl(domain)}
          alt=""
          loading="lazy"
          decoding="async"
          width={28}
          height={28}
          onError={(e) => { e.currentTarget.style.display = "none"; }}
        />
      )}
    </span>
  );
}
