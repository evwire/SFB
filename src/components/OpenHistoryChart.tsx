"use client";

/** Step chart of verified open-US site counts — only real snapshot points. */
import type { OpenHistoryPoint } from "@/lib/open-history-types";

export default function OpenHistoryChart({
  points,
  compact = false,
}: {
  points: OpenHistoryPoint[];
  compact?: boolean;
}) {
  if (points.length === 0) return null;

  const w = 640;
  const h = compact ? 72 : 140;
  const padL = 36;
  const padR = 48;
  const padT = compact ? 12 : 18;
  const padB = compact ? 22 : 32;
  const counts = points.map((p) => p.count);
  const minC = Math.min(...counts) - 2;
  const maxC = Math.max(...counts) + 2;
  const xAt = (i: number) =>
    points.length === 1
      ? padL + (w - padL - padR) / 2
      : padL + (i / (points.length - 1)) * (w - padL - padR);
  const yAt = (c: number) =>
    padT + ((maxC - c) / (maxC - minC || 1)) * (h - padT - padB);

  // Step path
  let d = "";
  points.forEach((p, i) => {
    const x = xAt(i);
    const y = yAt(p.count);
    if (i === 0) d += `M ${x} ${y}`;
    else {
      const px = xAt(i - 1);
      const py = yAt(points[i - 1]!.count);
      d += ` H ${x} V ${y}`;
      void px;
      void py;
    }
  });

  const first = points[0]!;
  const last = points[points.length - 1]!;
  const delta = last.count - first.count;
  const deltaLabel =
    delta === 0 ? "no change" : `${delta > 0 ? "+" : ""}${delta} since ${first.label}`;

  return (
    <figure className={"history-chart" + (compact ? " history-compact" : "")} aria-label="Open US sites over verified snapshots">
      <svg viewBox={`0 0 ${w} ${h}`} className="history-chart-svg" role="img">
{/* baseline */}
        <line
          x1={padL}
          x2={w - padR}
          y1={h - padB}
          y2={h - padB}
          className="history-axis"
        />
        <path d={d} className="history-step" fill="none" />
        {points.map((p, i) => {
          const x = xAt(i);
          const y = yAt(p.count);
          return (
            <g key={p.date}>
              <circle cx={x} cy={y} r={5} className="history-dot" />
              <text x={x} y={y - 10} textAnchor="middle" className="history-count">
                {p.count}
              </text>
              <text x={x} y={h - padB + 16} textAnchor="middle" className="history-date">
                {p.label}
              </text>
            </g>
          );
        })}
        {delta !== 0 ? (
          <text x={w - padR} y={yAt(last.count)} textAnchor="end" dy="-14" className="history-anno">
            {deltaLabel}
          </text>
        ) : null}
      </svg>
      <figcaption className="history-caption">
        {compact
          ? `Open US: ${first.count} → ${last.count} (verified snapshots)`
          : `Verified open US counts from snapshot stamps${
              points.length === 2
                ? ` (${first.count} → ${last.count})`
                : ` (${points.length} points)`
            }. No interpolated history.`}
      </figcaption>
    </figure>
  );
}
