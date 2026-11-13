import type { ChartModel } from "@/lib/charts";
import ChartCard from "./ChartCard";
import DashCard from "./DashCard";

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
          <p className="w-lede">Built from the same Tesla data as the map, so they update when it does. Every chart downloads as a clean PNG with the data date and the link.</p>
        </div>
      </div>
      <section className="dz-charts w-wrap" aria-label="Charts">
        <div className="dz-chartgrid">
          <DashCard />
          {charts.map((c) => (
            <ChartCard key={c.id} model={c} host={host} />
          ))}
        </div>
      </section>
    </>
  );
}
