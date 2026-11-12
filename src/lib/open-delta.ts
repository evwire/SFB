import type { OpenHistoryPoint } from "./open-history-types";

/** Inline “+N since <label>” from verified history. Never invents points. */
export function openUsDeltaLabel(points: OpenHistoryPoint[]): string | null {
  if (points.length < 2) return null;
  const first = points[0]!;
  const last = points[points.length - 1]!;
  const delta = last.count - first.count;
  if (delta === 0) return null;
  return `${delta > 0 ? "+" : ""}${delta} since ${first.label}`;
}
