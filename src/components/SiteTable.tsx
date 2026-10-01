import { STATUS_STYLE } from "@/lib/style";
import type { Site } from "@/lib/types";

/**
 * The server-rendered list under the map. This is the part crawlers and language
 * models actually read, so every site appears here in full even when the map cannot
 * plot it. Server-rendered or it does not exist (STACK.md).
 */
export default function SiteTable({ sites, areaNoun = "states", upcoming = false }: { sites: Site[]; areaNoun?: string; upcoming?: boolean }) {
  const areaSingular = areaNoun.replace(/ies$/, "y").replace(/s$/, "");

  const rows = [...sites].sort((a, b) => {
    const s = (a.state ?? "").localeCompare(b.state ?? "");
    return s !== 0 ? s : (a.city ?? "").localeCompare(b.city ?? "");
  });

  return (
    <div className="table-wrap glass">
      <table className="sites">
        <caption className="sr-only">
          Every Tesla customer-owned Supercharger in this region, with operator, stall count,
          power, status and source.
        </caption>
        <thead>
          <tr>
            <th scope="col">Location</th>
            <th scope="col">Operator</th>
            <th scope="col">Stalls</th>
            <th scope="col">Power</th>
            <th scope="col">Status</th>
            <th scope="col">{areaSingular[0].toUpperCase() + areaSingular.slice(1)}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((s) => {
            const st = STATUS_STYLE[s.status];
            return (
              <tr key={s.slug}>
                <th scope="row">
                  <a className="link" href={s.sourceUrl} target="_blank" rel="noopener">{s.name}</a>
                  <span className="cell-sub">
                    {s.city ? `${s.city}, ${s.state}` : `${s.state}, exact town not stated`}
                    {s.siteClass === "Heavy-duty" && " · heavy-duty MCS"}
                  </span>
                </th>
                <td>{s.operator ?? <span className="dim">{upcoming ? "not stated until open" : "n/s"}</span>}</td>
                <td className="mono">{s.stalls ?? <span className="dim">n/s</span>}</td>
                <td className="mono">{s.powerKw != null ? `${s.powerKw} kW` : <span className="dim">n/s</span>}</td>
                <td>
                  <span aria-hidden="true" style={{ color: st.color }}>{st.glyph}</span> {st.label}
                </td>
                <td className="mono">{s.state}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="table-foot">
        <span className="mono">n/s</span> means Tesla did not publish that figure. Links open the
        Tesla Find Us page.{" "}
        {upcoming
          ? "Operator isn’t shown on upcoming sites until they open."
          : "Operator names come from Tesla."}
      </p>
    </div>
  );
}
