/** One colour per operator for the map pins. Francis Energy is one network with 26 sites, so it gets a muted slate. */
const PALETTE = ["#E4572E", "#0E9F9F", "#7C3AED", "#D6246E", "#2563EB", "#B8860B", "#0891B2", "#C2410C", "#9333EA", "#4D7C0F"];
export const FRANCIS = "Francis Energy";
export const FRANCIS_COLOR = "#7F8E9B";
export const OTHER_COLOR = "#4F6B5E";
export const UNKNOWN_COLOR = "#9AA7A2";

export function makeOpColor(order: string[]): (op: string | null) => string {
  const m = new Map<string, string>();
  let i = 0;
  for (const op of order) {
    if (op === FRANCIS) m.set(op, FRANCIS_COLOR);
    else if (i < PALETTE.length) m.set(op, PALETTE[i++]);
  }
  return (op) => (op ? m.get(op) ?? OTHER_COLOR : UNKNOWN_COLOR);
}
