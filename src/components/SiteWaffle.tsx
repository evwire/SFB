"use client";

/** Compact 64-unit waffle: Francis blue vs other cool grey. */
export default function SiteWaffle({
  francis,
  other,
  label,
}: {
  francis: number;
  other: number;
  label?: string;
}) {
  const total = francis + other;
  if (total <= 0) return null;
  const cells = Array.from({ length: total }, (_, i) => (i < francis ? "f" : "o"));
  return (
    <div className="site-waffle" role="img" aria-label={label ?? `${francis} Francis, ${other} others`}>
      <div className="site-waffle-grid" style={{ ["--waffle-n" as string]: Math.min(16, total) }}>
        {cells.map((k, i) => (
          <span key={i} className={"site-waffle-cell" + (k === "f" ? " is-francis" : " is-other")} />
        ))}
      </div>
      <p className="site-waffle-caption tnum">
        <span className="site-waffle-swatch is-francis" aria-hidden="true" />
        {francis} Francis
        <span className="site-waffle-gap" />
        <span className="site-waffle-swatch is-other" aria-hidden="true" />
        {other} other operators
      </p>
    </div>
  );
}
