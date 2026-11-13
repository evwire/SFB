import type { ChartModel } from "@/lib/charts";
import ChartCard from "./ChartCard";

/** The Charts tab: every card is built from the live snapshot, so a new data pull changes them on the next deploy. */
export default function ChartsTab({ charts, host }: { charts: ChartModel[]; host: string }) {
  return (
    <>
      <div className="w-tabhead">
        <div className="w-wrap">
          <p className="w-eyebrow">Charts</p>
          <h1 className="w-h2">
            Supercharger for Business, in charts<span>.</span>
          </h1>
          <p className="w-lede">Built from the same Tesla Find Us data as the map, so they change when the data does. Each one downloads as a PNG with the source and the date on it.</p>
        </div>
      </div>
      <section className="dz-charts w-wrap" aria-label="Charts">
        <div className="dz-chartgrid">
          {charts.map((c) => (
            <ChartCard key={c.id} model={c} host={host} />
          ))}
        </div>
      </section>
    </>
  );
}
