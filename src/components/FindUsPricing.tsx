import { pricingViews } from "@/lib/findus-pricing";
import { fmtDate } from "@/lib/style";
import type { FindUsPricing } from "@/lib/types";

/**
 * Per-site Find Us rates on the site card.
 * Quiet when Tesla did not send a pricebook: the same "not stated" as the other facts.
 * This block is not the programme-level Tesla fee.
 */
export default function FindUsPricingBlock({ pricing }: { pricing: FindUsPricing | null }) {
  const present = Boolean(pricing && (pricing.tesla_and_members || pricing.non_tesla || pricing.unspecified));
  const views = present && pricing ? pricingViews(pricing) : [];

  return (
    <section className="findus-pricing" aria-label="Tesla pricing">
      <h3>Tesla pricing</h3>
      {!present ? (
        <p className="price-missing"><em>not stated</em></p>
      ) : (
        <>
          {views.map((view) => (
            <div className="price-block" key={view.title}>
              <h4 className="price-k">{view.title}</h4>
              {view.missing ? (
                <p className="price-missing"><em>not stated</em></p>
              ) : (
                <>
                  {view.energyText && <p className="price-line">{view.energyText}</p>}
                  {view.energyRows && view.energyRows.length > 0 && (
                    <ul className="price-lines">
                      {view.energyRows.map((row, index) => (
                        <li key={`${row.when ?? "rate"}-${index}`}>
                          {row.when && <span className="when">{row.when}</span>}
                          <span>{row.amount}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {view.congestion && <p className="price-line">{view.congestion}</p>}
                  {view.other.map((line) => (
                    <p className="price-line" key={line}>{line}</p>
                  ))}
                  {view.chartLabels && <p className="price-note">{view.chartLabels}</p>}
                </>
              )}
            </div>
          ))}
          {pricing?.capture === "screenshot" && pricing.captured_on && (
            <p className="price-note">Captured {fmtDate(pricing.captured_on)} from a Tesla page. Not a live pull.</p>
          )}
          {pricing?.capture === "live" && pricing.pulled_at && (
            <p className="price-note">Pulled {fmtDate(pricing.pulled_at.slice(0, 10))} from Tesla.</p>
          )}
          {pricing?.capture_note && <p className="price-note">{pricing.capture_note}</p>}
        </>
      )}
    </section>
  );
}
