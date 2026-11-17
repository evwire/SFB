// Shrinks the generated basemap paths: 1-decimal coordinates (0.1 of a viewBox unit is far below a screen pixel at
// any zoom the map allows), near-duplicate points dropped, and specks (rings under ~0.8 units across) removed.
// Run after build-geo.mjs: node scripts/simplify-geo.mjs
import fs from "node:fs";

export function simplifyPath(d) {
  const rings = d.split(/(?=M)/);
  const out = [];
  for (const ring of rings) {
    const pts = [...ring.matchAll(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g)].map((m) => [(+m[1]).toFixed(1), (+m[2]).toFixed(1)]);
    if (pts.length < 3) continue;
    const xs = pts.map((p) => +p[0]), ys = pts.map((p) => +p[1]);
    if (Math.max(...xs) - Math.min(...xs) < 0.8 && Math.max(...ys) - Math.min(...ys) < 0.8) continue;
    // drop points within 0.45 units of the last kept one (about a third of a pixel at the default zoom)
    const keep = [pts[0]];
    for (let i = 1; i < pts.length; i++) {
      const [lx, ly] = keep[keep.length - 1];
      if (Math.hypot(pts[i][0] - lx, pts[i][1] - ly) >= 0.45 || i === pts.length - 1) keep.push(pts[i]);
    }
    if (keep.length < 3) continue;
    out.push("M" + keep.map((p) => `${+p[0]},${+p[1]}`).join("L") + "Z");
  }
  return out.join("");
}

for (const f of ["src/lib/us-states.generated.ts", "src/lib/europe-countries.generated.ts"]) {
  const src = fs.readFileSync(f, "utf8");
  const next = src.replace(/"d":"([^"]*)"/g, (_, d) => `"d":"${simplifyPath(d)}"`);
  fs.writeFileSync(f, next);
  console.log(f, src.length, "->", next.length);
}
