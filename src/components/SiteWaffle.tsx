"use client";

/** Compact site waffle: Francis blue vs other cool grey. Legend uses site + operator counts. */
export default function SiteWaffle({
  francis,
  otherSites,
  otherOperators,
}: {
  francis: number;
  otherSites: number;
  otherOperators: number;
}) {
  const total = francis + otherSites;
  if (total <= 0) return null;
  const cells = Array.from({ length: total }, (_, i) => (i < francis ? "f" : "o"));
  return (
    <div
      className="site-waffle"
      role="img"
      aria-label={`${francis} Francis sites, ${otherSites} sites run by ${otherOperators} other operators`}
    >
      <div className="site-waffle-grid">
        {cells.map((k, i) => (
          <span key={i} className={"site-waffle-cell" + (k === "f" ? " is-francis" : " is-other")} />
        ))}
      </div>
      <p className="site-waffle-caption tnum">
        <span className="site-waffle-item">
          <span className="site-waffle-swatch is-francis" aria-hidden="true" />
          {francis} Francis
        </span>
        <span className="site-waffle-item">
          <span className="site-waffle-swatch is-other" aria-hidden="true" />
          {otherSites} sites · {otherOperators} other operators
        </span>
      </p>
    </div>
  );
}
