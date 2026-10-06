/**
 * 3/4 isometric stall layout. Same scale for every size:
 * ≤6 stalls → single row; otherwise two facing rows of ceil(n/2) / floor(n/2).
 * Geometry mirrors workspace/mock/gen34.py.
 */

type Props = {
  stalls: number;
  /** CSS colour or var() used for plate + posts. */
  color: string;
  className?: string;
};

const IW = 26; // stall cell width
const IDP = 40; // row depth
const HH = 22; // post height
const TH = 6; // plate thickness
const C30 = Math.cos(Math.PI / 6);
const S30 = 0.5;

function layoutFor(n: number): { rows: number; perRow: number[] } {
  const count = Math.max(0, Math.floor(n));
  if (count <= 0) return { rows: 0, perRow: [] };
  if (count <= 6) return { rows: 1, perRow: [count] };
  const a = Math.ceil(count / 2);
  const b = count - a;
  return { rows: 2, perRow: [a, b] };
}

function P(ox: number, oy: number, x: number, y: number, z = 0): [number, number] {
  return [ox + (x - y) * C30, oy + (x + y) * S30 - z];
}

function pts(list: [number, number][]): string {
  return list.map(([a, b]) => `${a.toFixed(1)},${b.toFixed(1)}`).join(" ");
}

export default function StallLayoutIso({ stalls, color, className }: Props) {
  const { rows, perRow } = layoutFor(stalls);
  if (rows === 0) {
    return (
      <svg className={className} viewBox="0 0 40 24" aria-hidden="true">
        <title>{stalls} stalls</title>
      </svg>
    );
  }

  const per = Math.max(...perRow);
  const L = per * IW;
  const D = rows * IDP;
  const ox = D * C30;
  const oy = HH + 4;
  const maxX = ox + L * C30 + 8;
  const maxY = oy + (L + D) * S30 + TH + 4;
  const minX = -4;
  const minY = -2;
  const vbW = maxX - minX;
  const vbH = maxY - minY;

  const plate = `color-mix(in srgb, ${color} 14%, white)`;
  const plateEdge = `color-mix(in srgb, ${color} 40%, #666)`;
  const plateSide = `color-mix(in srgb, ${color} 28%, #444)`;
  const postTop = `color-mix(in srgb, ${color} 25%, white)`;
  const postLeft = `color-mix(in srgb, ${color} 82%, black)`;
  const postRight = `color-mix(in srgb, ${color} 62%, black)`;

  const boxes: { x0: number; y0: number }[] = [];
  for (let r = 0; r < rows; r++) {
    const count = perRow[r] ?? 0;
    for (let i = 0; i < count; i++) {
      const x0 = i * IW + IW / 2 - 4.5;
      const y0 = rows === 2 ? (r === 0 ? IDP - 10 : IDP + 2) : 4;
      boxes.push({ x0, y0 });
    }
  }
  boxes.sort((a, b) => a.x0 + a.y0 - (b.x0 + b.y0));

  return (
    <svg
      className={className}
      viewBox={`${minX} ${minY} ${vbW} ${vbH}`}
      role="img"
      aria-label={`${stalls}-stall layout`}
    >
      {/* Plate thickness (left/right faces) */}
      <polygon
        points={pts([
          P(ox, oy, 0, D),
          P(ox, oy, L, D),
          P(ox, oy, L, D, -TH),
          P(ox, oy, 0, D, -TH),
        ])}
        fill={plateEdge}
      />
      <polygon
        points={pts([
          P(ox, oy, L, 0),
          P(ox, oy, L, D),
          P(ox, oy, L, D, -TH),
          P(ox, oy, L, 0, -TH),
        ])}
        fill={plateSide}
      />
      {/* Top plate */}
      <polygon
        className="size-iso-plate"
        points={pts([P(ox, oy, 0, 0), P(ox, oy, L, 0), P(ox, oy, L, D), P(ox, oy, 0, D)])}
        fill={plate}
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      {/* Stall dividers */}
      {Array.from({ length: per + 1 }, (_, i) => {
        const a = P(ox, oy, i * IW, 0);
        const b = P(ox, oy, i * IW, D);
        return (
          <line
            key={`v-${i}`}
            x1={a[0]}
            y1={a[1]}
            x2={b[0]}
            y2={b[1]}
            stroke="#fff"
            strokeWidth={2.5}
          />
        );
      })}
      {rows === 2 ? (
        <line
          x1={P(ox, oy, 0, IDP)[0]}
          y1={P(ox, oy, 0, IDP)[1]}
          x2={P(ox, oy, L, IDP)[0]}
          y2={P(ox, oy, L, IDP)[1]}
          stroke="#fff"
          strokeWidth={2.5}
        />
      ) : null}
      {/* Charger posts */}
      {boxes.map(({ x0, y0 }, idx) => {
        const x1 = x0 + 9;
        const y1 = y0 + 8;
        return (
          <g key={idx}>
            <polygon
              points={pts([
                P(ox, oy, x0, y1),
                P(ox, oy, x1, y1),
                P(ox, oy, x1, y1, HH),
                P(ox, oy, x0, y1, HH),
              ])}
              fill={postLeft}
            />
            <polygon
              points={pts([
                P(ox, oy, x1, y0),
                P(ox, oy, x1, y1),
                P(ox, oy, x1, y1, HH),
                P(ox, oy, x1, y0, HH),
              ])}
              fill={postRight}
            />
            <polygon
              points={pts([
                P(ox, oy, x0, y0, HH),
                P(ox, oy, x1, y0, HH),
                P(ox, oy, x1, y1, HH),
                P(ox, oy, x0, y1, HH),
              ])}
              fill={postTop}
            />
          </g>
        );
      })}
    </svg>
  );
}

/** CSS colour token for a known stall size (brand extended accents). */
export function stallSizeColor(stalls: number): string {
  switch (stalls) {
    case 4:
      return "var(--signal)";
    case 6:
      return "var(--teal)";
    case 8:
      return "var(--blue)";
    case 12:
      return "var(--violet)";
    case 20:
      return "var(--amber)";
    default:
      return "var(--signal)";
  }
}
