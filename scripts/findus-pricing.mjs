/**
 * Parse Tesla Find Us per-site pricing from a location page.
 *
 * Prices are embedded in the detail HTML:
 *   __NEXT_DATA__.props.pageProps.locationData.effectivePricebooks
 *
 * There is no separate pricing request on this path. programme.economics.tesla_fee
 * is the programme-level fee and is never read here.
 *
 * A missing pricebook stays null. Clock ranges, audiences, and congestion caps
 * are copied only from fields Tesla (or a checked-in page capture) actually sent.
 */

const NEXT_DATA_RE = /<script[^>]*id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i;

const KNOWN_PATHS = [
  ["props", "pageProps", "locationData", "effectivePricebooks"],
  ["props", "pageProps", "formattedData", "locationData", "effectivePricebooks"],
  ["props", "pageProps", "data", "locationData", "effectivePricebooks"],
  ["pageProps", "locationData", "effectivePricebooks"],
  ["locationData", "effectivePricebooks"],
  ["data", "locationData", "effectivePricebooks"],
  ["effectivePricebooks"],
];

/**
 * @param {unknown} input HTML, a __NEXT_DATA__ object, or a fixture with that object nested
 * @param {{ pulled_at?: string | null, capture?: string | null, captured_on?: string | null, capture_note?: string | null }} [opts]
 * @returns {object | null} Normalized findus_pricing, or null when no pricebook array exists.
 */
export function parseFindUsPricing(input, opts = {}) {
  const located = locatePricebooks(input);
  if (!located) return null;
  return normalizePricebooks(located.books, located.parent, opts);
}

/** Fixture JSON: parse the books and copy the capture note onto the result. */
export function pricingFromFixture(fixture) {
  const cap = fixture && typeof fixture === "object" && fixture._capture && typeof fixture._capture === "object"
    ? fixture._capture
    : {};
  return parseFindUsPricing(fixture, {
    pulled_at: null,
    capture: cap.capture || "screenshot",
    captured_on: cap.captured_on || null,
    capture_note: cap.note || null,
  });
}

/**
 * Stable one-line digest for the snapshot diff.
 * Ignores pulled_at and capture notes, so a re-pull of the same rates is not notable.
 * @param {unknown} pricing
 * @returns {string | null}
 */
export function pricingDigest(pricing) {
  if (pricing == null) return null;
  if (typeof pricing !== "object") return String(pricing);
  const bits = [];
  if (pricing.currency) bits.push(String(pricing.currency));
  bits.push(`tesla: ${audienceDigest(pricing.tesla_and_members)}`);
  bits.push(`non-tesla: ${audienceDigest(pricing.non_tesla)}`);
  if (pricing.unspecified) bits.push(`unspecified: ${audienceDigest(pricing.unspecified)}`);
  return bits.join(" | ");
}

export function locatePricebooks(input) {
  const data = coerceToObject(input);
  if (!data || typeof data !== "object") return null;
  for (const path of KNOWN_PATHS) {
    const hit = readPath(data, path);
    if (hit && Array.isArray(hit.value)) return { books: hit.value, parent: hit.parent };
  }
  return walkForBooks(data);
}

function coerceToObject(input) {
  if (input == null) return null;
  if (typeof input === "string") {
    const trimmed = input.trim();
    if (!trimmed) return null;
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      try {
        return JSON.parse(trimmed);
      } catch {
        /* HTML that happens to start with a brace falls through. */
      }
    }
    const match = trimmed.match(NEXT_DATA_RE);
    if (!match) return null;
    try {
      return JSON.parse(match[1]);
    } catch {
      return null;
    }
  }
  if (typeof input === "object") return input;
  return null;
}

function readPath(root, path) {
  let node = root;
  let parent = null;
  for (const key of path) {
    if (!node || typeof node !== "object" || !(key in node)) return null;
    parent = node;
    node = node[key];
  }
  return { value: node, parent };
}

function walkForBooks(node, depth = 0, seen = new Set()) {
  if (!node || typeof node !== "object" || depth > 8) return null;
  if (seen.has(node)) return null;
  seen.add(node);
  if (Array.isArray(node)) {
    if (node.length >= 40 || depth >= 3) return null;
    for (const value of node) {
      if (value && typeof value === "object" && !Array.isArray(value)) {
        const hit = walkForBooks(value, depth + 1, seen);
        if (hit) return hit;
      }
    }
    return null;
  }
  if (Array.isArray(node.effectivePricebooks)) {
    return { books: node.effectivePricebooks, parent: node };
  }
  for (const value of Object.values(node)) {
    const hit = walkForBooks(value, depth + 1, seen);
    if (hit) return hit;
  }
  return null;
}

function normalizePricebooks(books, parent, opts) {
  const parsed = [];
  for (const row of books) {
    const item = rowToParsed(row);
    if (item) parsed.push(item);
  }
  const grouped = {
    tesla_and_members: [],
    non_tesla: [],
    unspecified: [],
  };
  for (const item of parsed) grouped[item.audience].push(item);

  const pricing = {
    pulled_at: opts.pulled_at ?? null,
    currency: sharedCurrency(parsed),
    tesla_and_members: buildAudience(grouped.tesla_and_members, parent, "tesla_and_members"),
    non_tesla: buildAudience(grouped.non_tesla, parent, "non_tesla"),
    source: "findus_effective_pricebooks",
    book_count: books.length,
  };
  const unspecified = buildAudience(grouped.unspecified, parent, "unspecified");
  if (unspecified) pricing.unspecified = unspecified;
  if (opts.capture) pricing.capture = opts.capture;
  if (opts.captured_on) pricing.captured_on = opts.captured_on;
  if (opts.capture_note) pricing.capture_note = opts.capture_note;
  return pricing;
}

function buildAudience(rows, parent, key) {
  if (!rows.length) return null;
  const energy = rows.filter((row) => row.kind === "energy").map((row) => stripRate(row.rate));
  const congestion = rows.filter((row) => row.kind === "congestion").map((row) => stripRate(row.rate));
  const other = rows.filter((row) => row.kind === "other").map((row) => stripRate(row.rate));
  const audience = { tou: touOf(rows) };
  if (energy.length) audience.energy = energy;
  if (congestion.length) audience.congestion = congestion;
  if (other.length) audience.other = other;
  if (rows.some((row) => row.kind === "congestion" && row.qualifier === "up to")) {
    audience.congestion_qualifier = "up to";
  }
  const labels = chartLabelsFor(parent, key);
  if (labels) audience.chart_axis_labels = labels;
  return audience;
}

function touOf(rows) {
  const energy = rows.filter((row) => row.kind === "energy");
  if (!energy.length) return null;
  const flags = energy.map((row) => row.isTou).filter((value) => value != null);
  if (flags.some(Boolean)) return true;
  const timed = energy.filter((row) => row.rate.start || row.rate.end);
  if (timed.length > 1) return true;
  if (energy.length > 1 && new Set(energy.map((row) => row.rate.rate)).size > 1) return true;
  if (flags.length && flags.every((value) => value === false)) return false;
  return null;
}

function chartLabelsFor(parent, audience) {
  if (!parent || typeof parent !== "object" || !parent.pricingChart || typeof parent.pricingChart !== "object") {
    return null;
  }
  const chart = parent.pricingChart;
  const who = asString(chart.audience);
  if (who && who !== audience) return null;
  if (!Array.isArray(chart.axis_labels)) return null;
  const labels = chart.axis_labels.map(asString).filter(Boolean);
  return labels.length ? labels : null;
}

function rowToParsed(row) {
  if (!row || typeof row !== "object" || Array.isArray(row)) return null;
  const uom = normalizeUom(row.uom ?? row.unit ?? row.unitOfMeasure);
  const rate = rateOf(row);
  const feeType = asString(row.feeType) || asString(row.fee_type);
  if (rate == null && !feeType) return null;
  return {
    audience: audienceOf(row),
    kind: kindOf(row, uom),
    isTou: asBool(row.isTou ?? row.isTOU ?? row.tou),
    qualifier: qualifierOf(row),
    rate: {
      rate,
      uom,
      currency: currencyOf(row),
      start: clockOf(row, "start"),
      end: clockOf(row, "end"),
      days: daysOf(row),
      fee_type: feeType,
      tiers: tiersOf(row),
    },
  };
}

function stripRate(rate) {
  const out = { rate: rate.rate };
  for (const key of ["uom", "currency", "start", "end", "days", "fee_type", "tiers"]) {
    const value = rate[key];
    if (value == null) continue;
    if (Array.isArray(value) && value.length === 0) continue;
    out[key] = value;
  }
  return out;
}

function sharedCurrency(rows) {
  const values = new Set(rows.map((row) => row.rate.currency).filter(Boolean));
  if (values.size === 1) return [...values][0];
  return null;
}

function audienceOf(row) {
  const member = asBool(row.isMemberPricebook ?? row.isMember);
  if (member === true) return "tesla_and_members";
  if (member === false) return "non_tesla";
  const make = asString(row.vehicleMakeType) || asString(row.vehicle_make_type) || "";
  if (!make) return "unspecified";
  if (/non[-_\s]?tesla|other\s*ev|ntsla/i.test(make)) return "non_tesla";
  if (/\btesla\b|\btsla\b/i.test(make)) return "tesla_and_members";
  return "unspecified";
}

function kindOf(row, uom) {
  const fee = asString(row.feeType) || asString(row.fee_type) || "";
  if (/congest|occupan|idle/i.test(fee)) return "congestion";
  if (/park/i.test(fee) && uom === "min") return "congestion";
  if (uom === "kWh" || /charg|energy|kwh/i.test(fee)) return "energy";
  if (uom === "min") return "congestion";
  return "other";
}

function qualifierOf(row) {
  if (row.rateIsMaximum === true || row.isMaximum === true || row.isMax === true) return "up to";
  const text = [row.displayText, row.rateLabel, row.label, row.description].map(asString).filter(Boolean).join(" ");
  if (/up to/i.test(text)) return "up to";
  return null;
}

function rateOf(row) {
  for (const key of ["rateBase", "rate", "price"]) {
    const value = asNumber(row[key]);
    if (value != null) return value;
  }
  return null;
}

function currencyOf(row) {
  const code = asString(row.currencyCode) || asString(row.currency);
  return code ? code.toUpperCase() : null;
}

function clockOf(row, which) {
  const keys = which === "start"
    ? ["startTime", "start", "fromTime", "periodStart"]
    : ["endTime", "end", "toTime", "periodEnd"];
  for (const key of keys) {
    const value = asString(row[key]);
    if (value) return value;
  }
  return null;
}

function daysOf(row) {
  const raw = row.days ?? row.daysOfWeek ?? row.dayOfWeek ?? null;
  if (raw == null) return null;
  const list = Array.isArray(raw) ? raw : String(raw).split(/[,|]/);
  const days = list.map((day) => asString(day)).filter(Boolean);
  return days.length ? days : null;
}

function tiersOf(row) {
  const tiers = ["rateTier1", "rateTier2", "rateTier3", "rateTier4"]
    .map((key) => asNumber(row[key]))
    .filter((value) => value != null);
  return tiers.length ? tiers : null;
}

function normalizeUom(value) {
  const raw = asString(value);
  if (!raw) return null;
  if (/^kwh$/i.test(raw) || /^kw\/h$/i.test(raw)) return "kWh";
  if (/^min(ute)?s?$/i.test(raw)) return "min";
  return raw;
}

function asNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function asString(value) {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const text = String(value).trim();
  return text === "" ? null : text;
}

function asBool(value) {
  return typeof value === "boolean" ? value : null;
}

function audienceDigest(audience) {
  if (!audience) return "unstated";
  const tou = audience.tou == null ? "" : audience.tou ? "TOU " : "flat ";
  const energy = (audience.energy || []).map(bandDigest).join(", ") || "unstated";
  const congestion = (audience.congestion || []).map(bandDigest).join(", ");
  const qualifier = audience.congestion_qualifier ? ` ${audience.congestion_qualifier}` : "";
  const other = (audience.other || []).map(bandDigest).join(", ");
  const axis = Array.isArray(audience.chart_axis_labels) && audience.chart_axis_labels.length
    ? ` axis:${audience.chart_axis_labels.join(",")}`
    : "";
  return `${tou}${energy}${congestion ? `; congestion${qualifier} ${congestion}` : ""}${other ? `; other ${other}` : ""}${axis}`.trim();
}

function bandDigest(band) {
  const rate = band.rate == null ? "null" : String(band.rate);
  const uom = band.uom ? `/${band.uom}` : "";
  const when = band.start || band.end ? `@${band.start || ""}-${band.end || ""}` : "";
  const days = Array.isArray(band.days) && band.days.length ? `(${band.days.join(",")})` : "";
  return `${rate}${uom}${when}${days}`;
}
