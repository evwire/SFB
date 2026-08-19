import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { getSiteData } from "@/lib/data";

/**
 * The social card, generated rather than stored.
 *
 * It replaces a committed public/og.png, which was the only binary file in the
 * project and the one file the GitHub contents API cannot carry, so it never
 * made it into the repo and every social card 404ed. Generating it removes the
 * binary and the problem together.
 *
 * The numbers are read from the same source as the page, so the card cannot
 * drift from it. They are also worded the way the page words them: what we have
 * covered, never what exists. Tesla publishes no list.
 */
export const runtime = "nodejs";
export const alt = "EVwire, every US Tesla Supercharger for Business site we have covered";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 300;

/**
 * A plain path, not require.resolve. Webpack tries to resolve a module specifier
 * at build time and cannot, because this is a font file rather than a module, so
 * the build fails outright. Reading it from disk at request time sidesteps that,
 * and next.config.mjs traces both files into the lambda so they are actually
 * there. woff, not woff2: Satori cannot decode woff2.
 */
function font(file: string) {
  return readFile(
    path.join(process.cwd(), "node_modules/@fontsource/fraunces/files", file)
  );
}

export default async function Image() {
  const { sites, aggregates } = await getSiteData();
  const sfb = sites.filter((s) => s.siteClass === "SfB");
  const states = new Set(sfb.map((s) => s.state)).size;
  const stalls = sfb.reduce((a, s) => a + (s.stalls ?? 0), 0);
  const claimed = aggregates.reduce((a, x) => a + x.stalls, 0);

  const [regular, semibold, italic] = await Promise.all([
    font("fraunces-latin-400-normal.woff"),
    font("fraunces-latin-600-normal.woff"),
    font("fraunces-latin-600-italic.woff"),
  ]);

  const stat = (value: string, label: string) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ fontSize: 64, fontFamily: "Fraunces", fontWeight: 600, color: "#0b1116", lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontSize: 21, color: "#4f5b66" }}>{label}</div>
    </div>
  );

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "68px 72px",
          backgroundColor: "#f2f5f4",
          // Satori parses a narrower gradient grammar than a browser: the two
          // length form, radial-gradient(900px 600px at ...), throws "missing
          // comma before color stops" at build time. circle at is understood.
          backgroundImage:
            "radial-gradient(circle at 4% -12%, rgba(27,145,82,0.22), rgba(27,145,82,0) 55%), radial-gradient(circle at 98% 6%, rgba(56,138,221,0.18), rgba(56,138,221,0) 55%)",
          fontFamily: "Fraunces",
          color: "#0b1116",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 40, height: 3, backgroundColor: "#1b9152" }} />
            <div style={{ fontSize: 21, letterSpacing: 3, color: "#4f5b66", textTransform: "uppercase" }}>
              Tesla Supercharger for Business
            </div>
          </div>
          <div
            style={{
              marginTop: 24,
              fontSize: 72,
              fontFamily: "Fraunces",
              fontWeight: 600,
              lineHeight: 1.08,
              letterSpacing: -1.5,
              maxWidth: 1010,
              display: "flex",
              flexWrap: "wrap",
            }}
          >
            Who owns a Supercharger&nbsp;
            {/* Italic, as on the page. The accent is the one italic word in the
                brand's headline treatment, so dropping it would make the card
                subtly not the site. */}
            <span style={{ color: "#15693e", fontStyle: "italic" }}>besides Tesla</span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
          <div style={{ display: "flex", gap: 76 }}>
            {stat(String(sfb.length), "sites we have covered")}
            {stat(String(states), "states")}
            {stat(String(stalls), "stalls counted")}
            {stat(`+${claimed}`, "more stalls claimed")}
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontSize: 20, color: "#64717f", maxWidth: 760 }}>
              Tesla publishes no list. This is what EVwire has reported and checked, so the real
              number is higher.
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 14, height: 14, borderRadius: 14, backgroundColor: "#1b9152" }} />
              <div style={{ fontSize: 30, fontWeight: 600, letterSpacing: -0.5 }}>EVwire</div>
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      // Fraunces throughout. Satori has no system fonts, so anything not covered
      // by a supplied face renders as nothing at all, and a card is a poster
      // rather than an interface, so the display serif carrying all of it reads
      // as deliberate rather than as the body font going missing.
      fonts: [
        { name: "Fraunces", data: regular, weight: 400, style: "normal" },
        { name: "Fraunces", data: semibold, weight: 600, style: "normal" },
        { name: "Fraunces", data: italic, weight: 600, style: "italic" },
      ],
    }
  );
}
