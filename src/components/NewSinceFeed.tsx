"use client";

import type { ChangeItem, LatestChanges } from "@/lib/types";

const KIND_LABEL: Record<string, string> = {
  opened: "Opened",
  new_open: "New · open",
  reappeared: "Back on list",
  new_upcoming: "New · upcoming",
  back_to_upcoming: "Back to upcoming",
  ownership_changed: "Ownership changed",
};

export function fmtDay(iso: string | null | undefined, withYear = false) {
  if (!iso) return "?";
  const d = new Date(`${iso}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", ...(withYear ? { year: "numeric" } : {}), timeZone: "UTC" });
}

export function placeOf(i: Pick<ChangeItem, "city" | "state" | "country" | "region" | "name">) {
  const area = i.region === "US" ? i.state : i.country === "GB" ? "UK" : i.country ?? i.state;
  if (i.city) return [i.city, area].filter(Boolean).join(", ");
  return i.name ?? "Unnamed site";
}

function detail(i: ChangeItem) {
  const bits: string[] = [];
  if (i.operator) bits.push(i.operator + (i.host && i.host !== i.operator ? ` at ${i.host}` : ""));
  else if (i.phase === "upcoming") bits.push("operator not stated until open");
  if (i.stalls != null) bits.push(`${i.stalls} stalls`);
  return bits.join(" · ");
}

function statusLine(i: ChangeItem) {
  if (i.kind === "opened") return i.previous_badge ? `was ${i.previous_badge.toLowerCase()}` : "now open";
  if (i.kind === "reappeared") return i.last_listed ? `last listed ${fmtDay(i.last_listed)}` : "listed again";
  if (i.phase === "upcoming") return i.badge ?? i.status ?? "upcoming";
  return i.status === "Operational" ? "open" : i.status ?? "";
}

export default function NewSinceFeed({
  changes,
  onPick,
  nameOf,
}: {
  changes: LatestChanges;
  onPick: (item: ChangeItem) => void;
  nameOf: (id: string) => string | null;
}) {
  const { items, removed, _meta } = changes;
  if (!items.length && !removed.length) return null;
  const gone = removed.filter((r) => r.explanation === "gone" || r.explanation === "gone_unverified");
  const tidied = removed.filter((r) => !(r.explanation === "gone" || r.explanation === "gone_unverified"));

  return (
    <section id="new" className="newfeed glass" aria-labelledby="newfeed-title">
      <div className="newfeed-head">
        <h2 id="newfeed-title">New since last check</h2>
        <span className="section-note">
          {fmtDay(_meta.from)} → {fmtDay(_meta.to, true)} · Tesla Find Us
        </span>
      </div>
      {items.length > 0 ? (
        <ul className="newfeed-list">
          {items.map((i) => (
            <li key={`${i.kind}-${i.id}`}>
              <button type="button" className="nf-item" onClick={() => onPick(i)} title="Show on the map">
                <span className={`nf-kind nf-${i.kind}`}>{KIND_LABEL[i.kind] ?? i.kind}</span>
                <strong className="nf-place">{placeOf(i)}</strong>
                <span className="nf-detail">{detail(i)}</span>
                <span className="nf-status mono">{statusLine(i)}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="nf-empty">No new or newly opened sites in this check.</p>
      )}
      {removed.length > 0 && (
        <details className="nf-removed">
          <summary>
            {gone.length > 0
              ? `${gone.length} upcoming site${gone.length === 1 ? "" : "s"} removed from Tesla’s map`
              : `${removed.length} pin${removed.length === 1 ? "" : "s"} tidied up`}
          </summary>
          {gone.length > 0 && (
            <p>
              {gone.map((r, n) => (
                <span key={r.id}>
                  {n > 0 && ", "}
                  {placeOf(r)}
                  <span className="dim"> ({(r.badge ?? r.status ?? "upcoming").toLowerCase()})</span>
                </span>
              ))}
              . No longer on Tesla’s map; cancelled or hidden, Tesla doesn’t say.
            </p>
          )}
          {tidied.length > 0 && (
            <p className="dim">
              Also gone, but not losses:{" "}
              {tidied.map((r, n) => {
                let why = "";
                if (r.explanation === "merged") {
                  const into = r.merged_into ? nameOf(r.merged_into) : null;
                  why =
                    r.merged_into_phase === "open"
                      ? `already open as ${into ?? "a listed site"} ${r.distance_m} m away`
                      : `duplicate of another upcoming pin ${r.distance_m} m away`;
                } else if (r.explanation === "replaced_by_other_pin") {
                  const own = r.other_pin_ownership ? r.other_pin_ownership.replace(/ Owned$/i, "-owned") : "different";
                  why = `Tesla now shows a ${own} pin ${r.distance_m} m away`;
                } else if (r.explanation === "reclassified") {
                  why = `now ${r.now_ownership?.toLowerCase() ?? "reclassified"}`;
                }
                return (
                  <span key={r.id}>
                    {n > 0 && "; "}
                    {placeOf(r)} ({why})
                  </span>
                );
              })}
              .
            </p>
          )}
        </details>
      )}
    </section>
  );
}
