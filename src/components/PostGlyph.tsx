/** Tiny isometric charger-post pictogram — the site’s ownable unit. */
type Props = {
  /** Number of posts to draw (capped for layout). */
  count: number;
  /** CSS colour for the subject accent, or muted ink. */
  color?: string;
  /** Max posts shown before “+N”. */
  max?: number;
  className?: string;
  title?: string;
};

const C30 = Math.cos(Math.PI / 6);
const S30 = 0.5;

/** Single post glyph in local units. */
function onePost(ox: number, oy: number, color: string, key: string) {
  const iw = 5.5;
  const idp = 4;
  const hh = 7;
  const th = 1.8;
  const P = (x: number, y: number, z = 0): [number, number] => [
    ox + (x - y) * C30,
    oy + (x + y) * S30 - z,
  ];
  const pts = (list: [number, number][]) => list.map(([a, b]) => `${a.toFixed(1)},${b.toFixed(1)}`).join(" ");
  const top = `color-mix(in srgb, ${color} 28%, white)`;
  const left = `color-mix(in srgb, ${color} 78%, black)`;
  const right = `color-mix(in srgb, ${color} 55%, black)`;
  const plate = `color-mix(in srgb, ${color} 18%, white)`;
  const edge = `color-mix(in srgb, ${color} 45%, #555)`;

  const base: [number, number][] = [P(0, 0), P(iw, 0), P(iw, idp), P(0, idp)];
  const faceL: [number, number][] = [P(0, 0), P(0, idp), P(0, idp, hh), P(0, 0, hh)];
  const faceR: [number, number][] = [P(0, 0), P(iw, 0), P(iw, 0, hh), P(0, 0, hh)];
  const roof: [number, number][] = [P(0, 0, hh), P(iw, 0, hh), P(iw, 0, hh + th), P(0, 0, hh + th)];

  return (
    <g key={key}>
      <polygon points={pts(base)} fill={plate} stroke={edge} strokeWidth={0.4} />
      <polygon points={pts(faceL)} fill={left} />
      <polygon points={pts(faceR)} fill={right} />
      <polygon points={pts(roof)} fill={top} />
    </g>
  );
}

export default function PostGlyph({
  count,
  color = "var(--subject)",
  max = 12,
  className,
  title,
}: Props) {
  const n = Math.max(0, Math.floor(count));
  const shown = Math.min(n, max);
  const extra = n - shown;
  const step = 7;
  const rows = shown > 6 ? 2 : 1;
  const perRow = rows === 2 ? Math.ceil(shown / 2) : shown;
  const vbW = Math.max(perRow * step + 6, 14) + (extra > 0 ? 18 : 0);
  const vbH = rows === 2 ? 22 : 14;

  const posts: { i: number; x: number; y: number }[] = [];
  for (let i = 0; i < shown; i++) {
    const r = rows === 2 ? Math.floor(i / perRow) : 0;
    const c = rows === 2 ? i % perRow : i;
    posts.push({ i, x: 2 + c * step, y: 11 + r * 8 });
  }

  return (
    <svg
      className={"post-glyph" + (className ? ` ${className}` : "")}
      width={vbW}
      height={vbH}
      viewBox={`0 0 ${vbW} ${vbH}`}
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
    >
      {title ? <title>{title}</title> : null}
      {posts.map((p) => onePost(p.x, p.y, color, `p-${p.i}`))}
      {extra > 0 ? (
        <text x={3 + perRow * step} y={vbH - 4} className="post-glyph-more" fill="currentColor">
          +{extra}
        </text>
      ) : null}
    </svg>
  );
}
