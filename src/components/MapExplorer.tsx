"use client";

import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { US_STATES, VIEW_W, VIEW_H } from "@/lib/us-states.generated";
import { STATUS_STYLE, STATUS_ORDER, fmtNum } from "@/lib/style";
import { clusterSites, type Cluster } from "@/lib/cluster";
import { brandLogoUrl, monogram, operatorDomain } from "@/lib/brand";
import SiteRecord from "@/components/SiteRecord";
import type { Site, SiteStatus, Aggregate } from "@/lib/types";

type Filter = "All" | SiteStatus;

/** Marker radius in viewBox units, so markers scale with the map instead of
 *  growing relative to it as the column narrows. At r=13 the three pairs that
 *  already collided at the old dot size still collide and nothing new does. */
const R = 13;

/** The side panel replaces the modal here. Below it the modal comes back. */
const WIDE = "(min-width: 1100px)";

function useIsWide() {
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(WIDE);
    const sync = () => setWide(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return wide;
}

export default function MapExplorer({ sites, aggregates }: { sites: Site[]; aggregates: Aggregate[] }) {
  const [filter, setFilter] = useState<Filter>("All");
  const [showHeavy, setShowHeavy] = useState(false);
  const [operator, setOperator] = useState<string>("All operators");
  const [selected, setSelected] = useState<Site | null>(null);
  /** A cluster the reader has opened but not yet picked from. */
  const [picking, setPicking] = useState<Cluster | null>(null);
  const [mounted, setMounted] = useState(false);
  const isWide = useIsWide();

  const dialogRef = useRef<HTMLDivElement>(null);
  const panelScrollRef = useRef<HTMLDivElement>(null);
  const returnFocusTo = useRef<string | null>(null);

  const operators = useMemo(
    () => ["All operators", ...Array.from(new Set(sites.map((s) => s.operator))).sort()],
    [sites]
  );

  /**
   * Filter state lives in the URL as well as in React, so a filtered view is a
   * link. Read after mount, because the server has no query string and deriving
   * initial state from it would mismatch on hydration. Unknown values are
   * ignored rather than applied, so a stale link cannot silently show nothing.
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
    window.history.replaceState(null, "", (q ? `?${q}` : window.location.pathname) + window.location.hash);
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
  const clusters = useMemo(() => clusterSites(plotted, R * 2), [plotted]);
  const statesWithSites = useMemo(
    () => new Set(sites.filter((s) => s.siteClass === "SfB").map((s) => s.state)),
    [sites]
  );

  // Headline figures, lifted out of the dashboard section so they sit beside the
  // map rather than below it. Francis Energy's operator claim stays separate
  // from the site totals, as everywhere else on this page.
  const stats = useMemo(() => {
    const sfb = sites.filter((s) => s.siteClass === "SfB");
    const known = sfb.filter((s) => s.stalls != null);
    return {
      sites: sfb.length,
      open: sfb.filter((s) => s.status === "Operational").length,
      states: new Set(sfb.map((s) => s.state)).size,
      stalls: known.reduce((a, s) => a + (s.stalls ?? 0), 0),
      missing: sfb.length - known.length,
      claimed: aggregates.reduce((a, x) => a + x.stalls, 0),
    };
  }, [sites, aggregates]);

  const close = useCallback(() => { setSelected(null); setPicking(null); }, []);

  const openSite = useCallback((s: Site) => {
    returnFocusTo.current = s.slug;
    setPicking(null);
    setSelected(s);
  }, []);

  const openCluster = useCallback((c: Cluster) => {
    returnFocusTo.current = c.key;
    if (c.sites.length === 1) { setPicking(null); setSelected(c.sites[0]); }
    else { setSelected(null); setPicking(c); }
  }, []);

  /**
   * Two presentations, two focus contracts.
   *
   * The side panel is not a dialog. It sits in the layout beside the map and
   * never covers it, so trapping focus inside it would be wrong: the reader
   * should be able to Tab straight back out to the next pin. Focus moves to its
   * heading on selection and Escape returns it to the marker.
   *
   * The modal below 1100px is a dialog and keeps the full treatment: focus in,
   * Tab trapped, scroll locked, focus restored on close.
   */
  useEffect(() => {
    if (!selected && !picking) return;
    const modal = !isWide;
    const node = modal ? dialogRef.current : panelScrollRef.current;
    // preventScroll, because the panel is already on screen beside the map and
    // the default scroll-into-view nudged the whole page down on every click.
    node?.focus({ preventScroll: true });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { close(); return; }
      if (!modal || e.key !== "Tab") return;
      const box = dialogRef.current;
      const items = Array.from(
        box?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'
        ) ?? []
      ).filter((el) => el.offsetParent !== null);
      if (items.length === 0) { e.preventDefault(); box?.focus(); return; }
      const first = items[0], last = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || active === box)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey);

    let restore = () => {};
    if (modal) {
      const prev = document.documentElement.style.overflow;
      document.documentElement.style.overflow = "hidden";
      restore = () => { document.documentElement.style.overflow = prev; };
    }
    return () => {
      document.removeEventListener("keydown", onKey);
      restore();
      const key = returnFocusTo.current;
      if (key) {
        document.querySelector<SVGGElement>(`[data-pin="${key}"]`)?.focus();
        returnFocusTo.current = null;
      }
    };
  }, [selected, picking, isWide, close]);

  const marker = (c: Cluster) => {
    const many = c.sites.length > 1;
    const lead = c.sites[0];
    const style = STATUS_STYLE[lead.status];
    // A dashed ring means the coordinate is a town centroid, not a parcel. Ring
    // colour still carries status, so one shape encodes both axes.
    const areaOnly = c.sites.every((m) => m.coordPrecision === "Area-Only");
    const domain = many ? "" : operatorDomain(lead.operator);
    const on = many
      ? picking?.key === c.key
      : selected?.slug === lead.slug;
    const label = many
      ? `${c.sites.length} sites at this location. ${c.sites.map((m) => m.name).join(", ")}. Choose one.`
      : `${lead.name}, ${lead.city ?? lead.state}. ${style.label}. ${lead.stalls ?? "unknown number of"} stalls.`;

    return (
      <g
        key={c.key}
        className={"mk" + (on ? " on" : "")}
        transform={`translate(${c.x} ${c.y})`}
        data-pin={many ? c.key : lead.slug}
        tabIndex={0}
        role="button"
        aria-label={label}
        onClick={() => openCluster(c)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openCluster(c); }
        }}
      >
        <g className="mk-in">
        <circle className="mk-face" r={R} />
        <circle
          className="mk-ring"
          r={R}
          style={{ stroke: many ? "var(--muted)" : style.color }}
          strokeDasharray={areaOnly ? "4 3" : undefined}
        />
        {many ? (
          <text className="mk-count" y={1}>{c.sites.length}</text>
        ) : (
          <>
            {/* Monogram underneath, logo on top. onError hides the logo so the
                monogram shows through. It is not optional: Chromium paints its
                broken-image glyph inside an SVG image element that fails, which
                looks like a bug in the disc rather than a missing logo. Seen in
                a screenshot, not reasoned about. */}
            {/* Neutral, not the operator accent. The ring already carries status,
                and a second colour inside it reads as a second meaning. The
                accent stays on the dashboard tiles, where nothing competes. */}
            <text className="mk-mono" y={1}>{monogram(lead.operator)}</text>
            {domain && (
              <image
                href={brandLogoUrl(domain)}
                x={-R + 4}
                y={-R + 4}
                width={(R - 4) * 2}
                height={(R - 4) * 2}
                preserveAspectRatio="xMidYMid meet"
                clipPath="url(#mk-clip)"
                onError={(e) => { (e.currentTarget as SVGImageElement).style.display = "none"; }}
              />
            )}
          </>
        )}
        {lead.siteClass === "Heavy-duty" && <circle className="mk-hd" r={R + 3.5} />}
        </g>
      </g>
    );
  };

  const panelBody = picking ? (
    <div className="record-pick">
      <div className="eyebrow">Same spot</div>
      <h2 id="record-title">{picking.sites.length} sites here</h2>
      <p className="record-pick-note">
        Their coordinates are close enough that one marker would sit on top of another.
        We have not moved them apart, because that would put a pin where no site is.
      </p>
      <ul className="record-pick-list">
        {picking.sites.map((s) => {
          const st = STATUS_STYLE[s.status];
          return (
            <li key={s.slug}>
              <button className="fbtn" onClick={() => openSite(s)}>
                <span aria-hidden="true" style={{ color: st.color }}>{st.glyph}</span> {s.name}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  ) : selected ? (
    <SiteRecord site={selected} headingId="record-title" />
  ) : null;

  /**
   * The record body renders in exactly one place at a time. Rendering it into
   * both the panel and the modal and hiding one with CSS put two copies in the
   * DOM, which meant two elements carrying id="record-title" and a dialog whose
   * aria-labelledby resolved to the hidden one. The aside itself always renders,
   * so the grid does not shift when the panel goes from idle to filled.
   */
  const docked = isWide ? panelBody : null;

  return (
    <>
      <div className="dashboard">
        <aside className="stats-rail" aria-label="Coverage at a glance">
          <div className="stat lead">
            <div className="stat-value">{stats.sites}</div>
            <div className="stat-label">sites we have covered</div>
            <div className="stat-note mono">{stats.open} of them open</div>
          </div>
          <div className="stat">
            <div className="stat-value">{stats.states}</div>
            <div className="stat-label">states</div>
          </div>
          <div className="stat">
            <div className="stat-value">{fmtNum(stats.stalls)}</div>
            <div className="stat-label">stalls counted</div>
            <div className="stat-note mono">
              {stats.missing > 0 ? `${stats.missing} never gave a number` : "every site counted"}
            </div>
          </div>
          <div className="stat">
            <div className="stat-value">{stats.claimed}</div>
            <div className="stat-label">more stalls claimed</div>
            <div className="stat-note mono">not covered one by one</div>
          </div>
          <p className="rail-note">
            Tesla publishes no list. This is what we have reported and checked, so the real
            number is higher.
          </p>
        </aside>

        <div className="map-col">
          <div className="controls">
            <div className="filter-row" role="group" aria-label="Filter sites by status">
              <button
                className={"fbtn" + (filter === "All" ? " on" : "")}
                onClick={() => setFilter("All")}
                aria-pressed={filter === "All"}
              >
                <span aria-hidden="true">All</span> ({sites.filter((s) => showHeavy || s.siteClass === "SfB").length})
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
                <span>Heavy-duty MCS</span>
              </label>
            </div>
          </div>

          <figure className="map-figure glass">
            {visible.length > 0 && (
              <div className="map-canvas">
                <svg
                  viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
                  className="usmap"
                  role="img"
                  aria-label={`Map of the United States showing ${plotted.length} Tesla Supercharger for Business sites covered by EVwire.`}
                >
                  <defs>
                    <clipPath id="mk-clip">
                      <circle r={R - 4} />
                    </clipPath>
                  </defs>
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
                  <g>{clusters.map(marker)}</g>
                </svg>
              </div>
            )}

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
                Pins sit at the middle of each town. A dashed ring marks that. Close enough to
                find the place, too coarse to park by.
              </span>
              {unplotted.length > 0 && (
                <span className="mono warn">
                  No pin for {unplotted.map((s) => s.name).join(", ")}. The article gave a state and
                  nothing finer, so there is nowhere honest to put {unplotted.length > 1 ? "them" : "it"}.
                </span>
              )}
            </figcaption>
          </figure>
        </div>

        {/* Side panel. A region, not a dialog: it never covers the map, so the
            reader must be able to Tab straight back out to the next marker. */}
        <aside className="record-col" aria-label="Site record">
          <div className="record-shell glass">
            {docked ? (
              <>
                <div className="record-chrome">
                  <span className="mono chrome-label">
                    {picking ? "CHOOSE A SITE" : "SITE RECORD"}
                  </span>
                  <button className="close" onClick={close} aria-label="Close site record">
                    &times;
                  </button>
                </div>
                <div className="record-scroll" ref={panelScrollRef} tabIndex={-1}>{docked}</div>
              </>
            ) : (
              <div className="record-idle">
                <p className="record-idle-head">Pick a site</p>
                <p className="record-idle-sub">
                  Every marker opens the record behind it: what the article stated, what it
                  never said, and the story it came from.
                </p>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Below 1100px the panel has nowhere to sit, so the record returns to a
          centred dialog with the full modal treatment. */}
      {mounted && !isWide && panelBody && createPortal(
        <div className="scrim" onClick={close} role="presentation">
          <div
            ref={dialogRef}
            className="panel glass"
            role="dialog"
            aria-modal="true"
            aria-labelledby="record-title"
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="panel-scroll">
              <div className="panel-chrome">
                <span className="dots" aria-hidden="true"><i /><i /><i /></span>
                <span className="mono chrome-label">
                  {picking ? "CHOOSE A SITE" : "SITE RECORD"}
                </span>
                <button className="close" onClick={close} aria-label="Close site record">
                  &times;
                </button>
              </div>
              <div className="panel-body">{panelBody}</div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
