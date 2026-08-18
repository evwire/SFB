"use client";

import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { US_STATES, VIEW_W, VIEW_H } from "@/lib/us-states.generated";
import { STATUS_STYLE, STATUS_ORDER, EVIDENCE_LABEL, pinRadius, fmtDate, humaniseUnstated } from "@/lib/style";
import type { Site, SiteStatus } from "@/lib/types";

type Filter = "All" | SiteStatus;

export default function MapExplorer({ sites }: { sites: Site[] }) {
  const [filter, setFilter] = useState<Filter>("All");
  const [showHeavy, setShowHeavy] = useState(false);
  const [operator, setOperator] = useState<string>("All operators");
  const [selected, setSelected] = useState<Site | null>(null);
  const [mounted, setMounted] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const returnFocusTo = useRef<string | null>(null);

  const operators = useMemo(
    () => ["All operators", ...Array.from(new Set(sites.map((s) => s.operator))).sort()],
    [sites]
  );

  /**
   * Filter state lives in the URL as well as in React, so a filtered view is a
   * link. "Every Francis Energy site we have covered" is a thing someone will
   * want to send to a colleague, and before this it was unsendable.
   *
   * Read happens after mount rather than during render: the server has no query
   * string, so deriving initial state from it would mismatch on hydration.
   * Unknown values are ignored rather than applied, otherwise a stale link
   * silently shows an empty map.
   */
  useEffect(() => {
    setMounted(true);
    const p = new URLSearchParams(window.location.search);
    const st = p.get("status");
    if (st === "All" || (st && (STATUS_ORDER as string[]).includes(st))) setFilter(st as Filter);
    const op = p.get("operator");
    if (op && operators.includes(op)) setOperator(op);
    if (p.get("heavy") === "1") setShowHeavy(true);
    // operators is derived from props that do not change after mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const p = new URLSearchParams(window.location.search);
    if (filter === "All") p.delete("status");
    else p.set("status", filter);
    if (operator === "All operators") p.delete("operator");
    else p.set("operator", operator);
    if (showHeavy) p.set("heavy", "1");
    else p.delete("heavy");
    const q = p.toString();
    const next = (q ? `?${q}` : window.location.pathname) + window.location.hash;
    window.history.replaceState(null, "", next);
  }, [mounted, filter, operator, showHeavy]);

  const visible = useMemo(
    () =>
      sites.filter((s) => {
        if (s.siteClass === "Heavy-duty" && !showHeavy) return false;
        if (filter !== "All" && s.status !== filter) return false;
        if (operator !== "All operators" && s.operator !== operator) return false;
        return true;
      }),
    [sites, filter, showHeavy, operator]
  );

  const plotted = visible.filter((s) => s.x != null && s.y != null);
  const unplotted = visible.filter((s) => s.x == null || s.y == null);
  const statesWithSites = useMemo(
    () => new Set(sites.filter((s) => s.siteClass === "SfB").map((s) => s.state)),
    [sites]
  );

  // Escape closes the panel and the scroll lock is set on the documentElement,
  // because body-level locks reset the scroll position (STACK.md, Events build).
  const close = useCallback(() => setSelected(null), []);

  /**
   * aria-modal tells assistive tech the rest of the page is inert, but it does
   * not move the keyboard. Without this the reader presses Enter on a pin, the
   * dialog opens, and focus is still on the pin behind the scrim: Tab then walks
   * the page underneath and Escape is the only way out of a dialog they were
   * never taken to. So: focus in on open, trap Tab inside, restore to the pin on
   * close (WCAG 2.1.2, 2.4.3).
   */
  useEffect(() => {
    if (!selected) return;
    const node = dialogRef.current;
    node?.focus();

    const focusable = () =>
      Array.from(
        node?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'
        ) ?? []
      ).filter((el) => el.offsetParent !== null);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { close(); return; }
      if (e.key !== "Tab") return;
      const items = focusable();
      if (items.length === 0) { e.preventDefault(); node?.focus(); return; }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || active === node)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
    };

    document.addEventListener("keydown", onKey);
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = prev;
      const slug = returnFocusTo.current;
      if (slug) {
        document.querySelector<SVGGElement>(`[data-pin="${slug}"]`)?.focus();
        returnFocusTo.current = null;
      }
    };
  }, [selected, close]);

  const openSite = useCallback((s: Site) => {
    returnFocusTo.current = s.slug;
    setSelected(s);
  }, []);

  return (
    <div className="map-wrap">
      <div className="controls">
        <div className="filter-row" role="group" aria-label="Filter sites by status">
          <button
            className={"fbtn" + (filter === "All" ? " on" : "")}
            onClick={() => setFilter("All")}
            aria-pressed={filter === "All"}
          >
            <span aria-hidden="true">◆</span> All ({sites.filter((s) => showHeavy || s.siteClass === "SfB").length})
          </button>
          {STATUS_ORDER.filter((st) => sites.some((s) => s.status === st)).map((st) => {
            const n = sites.filter((s) => s.status === st && (showHeavy || s.siteClass === "SfB")).length;
            if (n === 0) return null;
            const style = STATUS_STYLE[st];
            return (
              <button
                key={st}
                className={"fbtn" + (filter === st ? " on" : "")}
                onClick={() => setFilter(st)}
                aria-pressed={filter === st}
              >
                <span aria-hidden="true" style={{ color: style.color }}>{style.glyph}</span> {style.label} ({n})
              </button>
            );
          })}
        </div>

        <div className="filter-row secondary">
          <label className="sel">
            <span className="sr-only">Filter by operator</span>
            <select value={operator} onChange={(e) => setOperator(e.target.value)}>
              {operators.map((o) => <option key={o}>{o}</option>)}
            </select>
          </label>
          <label className="toggle">
            <input type="checkbox" checked={showHeavy} onChange={(e) => setShowHeavy(e.target.checked)} />
            <span>Include heavy-duty Tesla MCS sites</span>
          </label>
        </div>
      </div>

      <figure className="map-figure glass">
        {visible.length > 0 && <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          className="usmap"
          role="img"
          aria-label={`Map of the United States showing ${plotted.length} Tesla Supercharger for Business sites covered by EVwire.`}
        >
          <g>
            {US_STATES.map((st) => (
              <path
                key={st.abbr}
                d={st.d}
                className={"state" + (statesWithSites.has(st.abbr) ? " has" : "")}
              >
                <title>{st.name}</title>
              </path>
            ))}
          </g>
          <g>
            {plotted.map((s) => {
              const style = STATUS_STYLE[s.status];
              const r = pinRadius(s.stalls);
              const isArea = s.coordPrecision === "Area-Only";
              const on = selected?.slug === s.slug;
              return (
                <g
                  key={s.slug}
                  className={"pin" + (on ? " on" : "")}
                  transform={`translate(${s.x} ${s.y})`}
                  data-pin={s.slug}
                  onClick={() => openSite(s)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openSite(s); } }}
                  tabIndex={0}
                  role="button"
                  aria-label={`${s.name}, ${s.city ?? s.state}. ${style.label}. ${s.stalls ?? "unknown number of"} stalls.`}
                >
                  {isArea && <circle className="halo" r={r + 7} style={{ stroke: style.color }} />}
                  <circle className="core" r={r} style={{ fill: style.color }} />
                  {s.siteClass === "Heavy-duty" && <circle className="hd" r={r + 3.5} />}
                </g>
              );
            })}
          </g>
        </svg>}

        {visible.length === 0 && (
          <div className="map-empty">
            <p className="map-empty-head">Nothing matches those two filters together.</p>
            <p className="map-empty-sub">
              We have not covered a site that is both{" "}
              <strong>{filter === "All" ? "in every status" : STATUS_STYLE[filter].label.toLowerCase()}</strong>{" "}
              and run by <strong>{operator}</strong>. That is a gap in our reporting, not
              necessarily a gap in the world.
            </p>
            <button className="fbtn" onClick={() => { setFilter("All"); setOperator("All operators"); }}>
              Clear both filters
            </button>
          </div>
        )}

        <figcaption className="map-caption">
          <span className="sr-only" role="status" aria-live="polite">
            {visible.length === 0
              ? "No sites match the current filters."
              : `Showing ${visible.length} of ${sites.length} sites. ${plotted.length} on the map.`}
          </span>
          <span className="mono">
            Pins sit at the middle of each town. Close enough to find the place, too coarse
            to park by. The dashed ring is what marks that.
          </span>
          {unplotted.length > 0 && (
            <span className="mono warn">
              No pin for {unplotted.map((s) => s.name).join(", ")}. The article gave a state and
              nothing finer, so there is nowhere honest to put {unplotted.length > 1 ? "them" : "it"}.
            </span>
          )}
        </figcaption>
      </figure>

      {mounted && selected && createPortal(
        <div className="scrim" onClick={close} role="presentation">
          <div
            ref={dialogRef}
            className="panel glass"
            role="dialog"
            aria-modal="true"
            aria-labelledby="panel-title"
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="panel-scroll">
            <div className="panel-chrome">
              <span className="dots" aria-hidden="true"><i /><i /><i /></span>
              <span className="mono chrome-label">SITE RECORD</span>
              <button className="close" onClick={close} aria-label="Close site details">×</button>
            </div>
            <div className="panel-body">
              <div className="eyebrow" style={{ marginBottom: 10 }}>
                {selected.city ? `${selected.city}, ${selected.state}` : selected.state}
              </div>
              <h2 id="panel-title">{selected.name}</h2>
              {selected.milestone && <p className="milestone">{selected.milestone}</p>}

              <dl className="facts">
                <div><dt>Status</dt><dd><span style={{ color: STATUS_STYLE[selected.status].color }} aria-hidden="true">{STATUS_STYLE[selected.status].glyph}</span> {STATUS_STYLE[selected.status].label}</dd></div>
                <div><dt>Operator</dt><dd>{selected.operator}</dd></div>
                {selected.host && <div><dt>Host</dt><dd>{selected.host}{selected.hostType ? `, ${selected.hostType.toLowerCase()}` : ""}</dd></div>}
                <div><dt>Stalls</dt><dd>{selected.stalls ?? <em>not stated</em>}</dd></div>
                <div><dt>Hardware</dt><dd>{selected.hardware ?? <em>not stated</em>}</dd></div>
                <div><dt>Peak power</dt><dd>{selected.powerKw ? `${selected.powerKw} kW` : <em>not stated</em>}</dd></div>
                {selected.address && <div><dt>Address</dt><dd>{selected.address}</dd></div>}
                <div><dt>Opened</dt><dd>{selected.openedOn ? fmtDate(selected.openedOn) : <em>not stated</em>}</dd></div>
                <div><dt>First covered</dt><dd>{fmtDate(selected.firstConfirmed)}</dd></div>
              </dl>

              <p className="summary">{selected.summary}</p>

              <div className="provenance">
                <div className="prov-row">
                  <span className="chip"><span className="swatch" style={{ background: "var(--signal)" }} />Evidence {EVIDENCE_LABEL[selected.evidenceGrade]}</span>
                  <span className="chip">{selected.verification}</span>
                  <span className="chip">Location: {selected.coordPrecision === "Area-Only" ? "town level" : selected.coordPrecision.toLowerCase()}</span>
                </div>
                {selected.unstated.length > 0 && (
                  <p className="unstated">
                    <strong>Never reported:</strong>{" "}
                    {selected.unstated.map(humaniseUnstated).join(", ")}.
                  </p>
                )}
                {selected.notes && <p className="notes">{selected.notes}</p>}
              </div>

              <a className="cta" href={selected.sourceUrl} target="_blank" rel="noopener">
                Read the story
              </a>
            </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
