import { ImageResponse } from "next/og";
import { getDashData } from "@/lib/mapdata";
import { getProfiles, profileBySlug, rangeText } from "@/lib/operators";

export const alt = "EVwire operator profile";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export async function generateStaticParams() {
  return getProfiles(await getDashData()).map((p) => ({ slug: p.slug }));
}

/** A plain card: the name, the Tesla facts strip, and "Source: Tesla". */
export default async function Image({ params }: { params: { slug: string } }) {
  const d = await getDashData();
  const p = profileBySlug(d, params.slug);
  const f = p?.facts;
  const cells: [string, string][] = f
    ? ([
        ["Sites", String(f.sites)],
        ["Stalls", String(f.stalls)],
        f.kw != null ? ["Up to", `${f.kw} kW`] : null,
        f.tesla ? ["Tesla owners pay", `${rangeText(f.tesla)}/kWh`] : null,
      ].filter(Boolean) as [string, string][])
    : [["EVwire stories", String(p?.stories.length ?? 0)]];
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 64, background: "#f2f5f4", color: "#0b1116" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 28, fontWeight: 700 }}>
          <div style={{ width: 16, height: 16, borderRadius: 8, background: "#1b9152" }} />
          EVwire · Supercharger for Business
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 24, color: "#15693e", letterSpacing: 3, textTransform: "uppercase" }}>Operator</div>
          <div style={{ fontSize: 96, fontWeight: 700, letterSpacing: -3, lineHeight: 1.05 }}>{p?.name ?? "Operator"}</div>
          {p?.alias && <div style={{ display: "flex", fontSize: 34, color: "#4f5b66" }}>{`(${p.alias})`}</div>}
        </div>
        <div style={{ display: "flex", gap: 56, borderTop: "2px solid #0b1116", paddingTop: 26 }}>
          {cells.map(([k, v]) => (
            <div key={k} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ fontSize: 20, color: "#4f5b66", textTransform: "uppercase", letterSpacing: 2 }}>{k}</div>
              <div style={{ fontSize: 52, fontWeight: 600 }}>{v}</div>
            </div>
          ))}
          <div style={{ marginLeft: "auto", alignSelf: "flex-end", fontSize: 20, color: "#4f5b66" }}>{f ? "Source: Tesla" : "Quotes from EVwire articles"}</div>
        </div>
      </div>
    ),
    size,
  );
}
