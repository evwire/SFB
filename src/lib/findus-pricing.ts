import type { FindUsAudiencePricing, FindUsPricing, FindUsRate } from "./types";

const SYMBOLS: Record<string, string> = {
  USD: "$",
  GBP: "£",
  EUR: "€",
  CAD: "CA$",
  AUD: "A$",
};

export type PriceRow = { when: string | null; amount: string };

export type AudienceView = {
  title: string;
  missing: boolean;
  energyText: string | null;
  energyRows: PriceRow[] | null;
  congestion: string | null;
  other: string[];
  chartLabels: string | null;
};

function formatNumber(rate: number): string {
  const cents = Math.round(rate * 100) / 100;
  if (Math.abs(rate - cents) < 1e-9) return cents.toFixed(2);
  return String(rate);
}

export function formatRateAmount(rate: number | null, currency: string | null, uom: string | null): string {
  if (rate == null) return "not stated";
  const body = formatNumber(rate);
  const symbol = currency ? SYMBOLS[currency] : null;
  const money = symbol ? `${symbol}${body}` : currency ? `${body} ${currency}` : body;
  return uom ? `${money}/${uom}` : money;
}

function whenText(band: FindUsRate): string | null {
  const days = band.days?.length ? ` (${band.days.join(", ")})` : "";
  if (band.start && band.end) return `${band.start} to ${band.end}${days}`;
  if (band.start) return `from ${band.start}${days}`;
  if (band.end) return `until ${band.end}${days}`;
  return days ? days.trim() : null;
}

function sharedUom(rates: FindUsRate[]): string | null {
  const uoms = new Set(rates.map((rate) => rate.uom).filter(Boolean));
  return uoms.size === 1 ? [...uoms][0]! : null;
}

function moneyRange(rates: FindUsRate[], currency: string | null): string | null {
  const nums = rates.map((rate) => rate.rate).filter((rate): rate is number => rate != null);
  if (!nums.length) return null;
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const sample = rates.find((rate) => rate.currency) ?? rates[0];
  const cur = sample?.currency ?? currency;
  const uom = sharedUom(rates);
  if (min === max) return formatRateAmount(min, cur, uom);
  return `${formatRateAmount(min, cur, uom)} to ${formatRateAmount(max, cur, uom)}`;
}

function energyView(rates: FindUsRate[], currency: string | null): Pick<AudienceView, "energyText" | "energyRows"> {
  if (!rates.length) return { energyText: null, energyRows: null };
  const timed = rates.some((rate) => rate.start || rate.end);
  if (rates.length > 8) {
    const span = moneyRange(rates, currency);
    return {
      energyText: span ? `${rates.length} bands, ${span}` : `${rates.length} bands`,
      energyRows: null,
    };
  }
  if (!timed && rates.length > 1) {
    const uom = sharedUom(rates);
    const amounts = rates.map((rate) => formatRateAmount(rate.rate, rate.currency ?? currency, uom ? null : rate.uom ?? null));
    return {
      energyText: uom ? `${amounts.join(", ")} per ${uom}` : amounts.join(", "),
      energyRows: null,
    };
  }
  if (!timed && rates.length === 1) {
    const rate = rates[0];
    return {
      energyText: formatRateAmount(rate.rate, rate.currency ?? currency, rate.uom ?? null),
      energyRows: null,
    };
  }
  return {
    energyText: null,
    energyRows: rates.map((rate) => ({
      when: whenText(rate),
      amount: formatRateAmount(rate.rate, rate.currency ?? currency, rate.uom ?? null),
    })),
  };
}

function feeWord(rates: FindUsRate[]): string {
  const names = new Set(
    rates.map((rate) => {
      const fee = (rate.fee_type || "").toLowerCase();
      if (/congest/.test(fee)) return "Congestion";
      if (/occupan/.test(fee)) return "Occupancy";
      if (/idle/.test(fee)) return "Idle fee";
      if (/park/.test(fee)) return "Parking";
      if (fee) return fee.replace(/_/g, " ");
      return "Congestion";
    }),
  );
  return [...names].join(" and ");
}

function congestionText(audience: FindUsAudiencePricing, currency: string | null): string | null {
  const rows = audience.congestion ?? [];
  if (!rows.length) return null;
  const label = feeWord(rows);
  const span = moneyRange(rows, currency);
  const timed = rows.some((rate) => rate.start || rate.end);
  if (audience.congestion_qualifier === "up to" && span && (!timed || rows.length > 6)) {
    const ceiling = rows.map((rate) => rate.rate).filter((rate): rate is number => rate != null);
    const max = ceiling.length ? Math.max(...ceiling) : null;
    const sample = rows.find((rate) => rate.currency) ?? rows[0];
    return max == null ? null : `${label} up to ${formatRateAmount(max, sample?.currency ?? currency, sample?.uom ?? null)}`;
  }
  if (rows.length > 6 && span) return `${label} ${span} (${rows.length} bands)`;
  if (!timed && rows.length === 1 && span) return `${label} ${span}`;
  if (!timed && span) return `${label} ${span}`;
  return null;
}

function congestionRows(audience: FindUsAudiencePricing, currency: string | null): PriceRow[] | null {
  if (congestionText(audience, currency)) return null;
  const rows = audience.congestion ?? [];
  if (!rows.length) return null;
  const label = feeWord(rows);
  return rows.map((rate) => ({
    when: whenText(rate) ? `${label} ${whenText(rate)}` : label,
    amount: formatRateAmount(rate.rate, rate.currency ?? currency, rate.uom ?? null),
  }));
}

export function viewAudience(
  title: string,
  audience: FindUsAudiencePricing | null | undefined,
  currency: string | null,
): AudienceView {
  if (!audience || (!(audience.energy?.length) && !(audience.congestion?.length) && !(audience.other?.length))) {
    return {
      title,
      missing: true,
      energyText: null,
      energyRows: null,
      congestion: null,
      other: [],
      chartLabels: null,
    };
  }
  const energy = energyView(audience.energy ?? [], currency);
  const summary = congestionText(audience, currency);
  const listed = congestionRows(audience, currency);
  const other = (audience.other ?? []).map((rate) => {
    const name = rate.fee_type ? rate.fee_type.replace(/_/g, " ") : "Other fee";
    const when = whenText(rate);
    return `${name}${when ? ` ${when}` : ""}: ${formatRateAmount(rate.rate, rate.currency ?? currency, rate.uom ?? null)}`;
  });
  return {
    title,
    missing: false,
    energyText: energy.energyText,
    energyRows: listed ? [...(energy.energyRows ?? []), ...listed] : energy.energyRows,
    congestion: summary,
    other,
    chartLabels: audience.chart_axis_labels?.length
      ? `Chart labels: ${audience.chart_axis_labels.join(", ")}. Clock ranges were not printed.`
      : null,
  };
}

function audienceSentence(view: AudienceView): string {
  if (view.missing) return `${view.title}: not stated`;
  const bits: string[] = [];
  if (view.energyText) bits.push(view.energyText);
  if (view.energyRows?.length) {
    bits.push(view.energyRows.map((row) => (row.when ? `${row.when} ${row.amount}` : row.amount)).join("; "));
  }
  if (view.congestion) bits.push(view.congestion);
  bits.push(...view.other);
  if (view.chartLabels) bits.push(view.chartLabels);
  return `${view.title}: ${bits.join(". ")}`;
}

/** One plain sentence for the table and llms.txt. Null when this record has no pricebook. */
export function pricingPlain(pricing: FindUsPricing | null | undefined): string | null {
  if (!pricing || (!pricing.tesla_and_members && !pricing.non_tesla && !pricing.unspecified)) return null;
  const parts = [
    audienceSentence(viewAudience("Tesla and members", pricing.tesla_and_members, pricing.currency)),
    audienceSentence(viewAudience("Non-Tesla", pricing.non_tesla, pricing.currency)),
  ];
  if (pricing.unspecified) {
    parts.push(audienceSentence(viewAudience("Audience not stated", pricing.unspecified, pricing.currency)));
  }
  return parts.join(". ");
}

export function pricingViews(pricing: FindUsPricing): AudienceView[] {
  const views = [
    viewAudience("Tesla & members", pricing.tesla_and_members, pricing.currency),
    viewAudience("Non-Tesla", pricing.non_tesla, pricing.currency),
  ];
  if (pricing.unspecified) views.push(viewAudience("Audience not stated", pricing.unspecified, pricing.currency));
  return views;
}
