import type { Metadata } from "next";
import Wall from "@/components/wall/Wall";
import TabNav from "@/components/wall/TabNav";
import { DashProvider } from "@/components/wall/dash/DashContext";
import { DashFrame } from "@/components/wall/dash/DashFrame";
import DashSections from "@/components/wall/dash/DashSections";
import ChartsTab from "@/components/wall/ChartsTab";
import { buildCharts } from "@/lib/charts";
import { getChecks } from "@/lib/chart-history";
import { getDashData, PHOTO_SITE } from "@/lib/mapdata";
import { makeOpColor } from "@/lib/opcolor";
import { getWallData } from "@/lib/wall";
import { jsonLd } from "@/lib/jsonld";
import { getStackPayload } from "@/lib/stacks";
import StoryStacks from "@/components/stories/StoryStacks";

export const revalidate = 300;

const TITLE = "Anyone can now own a Tesla Supercharger. Meet the first owners.";
const DESCRIPTION =
  "Every customer-owned Tesla Supercharger on Tesla's map, in the US and Europe, open and upcoming. Who hosts and builds them, what drivers pay, with real photos and the stories behind them.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: { title: TITLE, description: DESCRIPTION },
  twitter: { title: TITLE, description: DESCRIPTION },
};

export default async function Page() {
  const d = await getWallData();
  const dash = await getDashData();
  const color = makeOpColor(dash.operatorOrder);
  const charts = buildCharts(dash, getChecks());
  const siteById = new Map(dash.sites.filter((x) => x.region === "us" && x.phase === "open").map((x) => [x.id, x]));
  const flights = Object.entries(PHOTO_SITE).flatMap(([pid, sid]) => {
    const site = siteById.get(sid);
    if (!site) return [];
    return [{ photoId: Number(pid), siteId: sid, x: site.x, y: site.y, color: "#1b9152", cover: site.photos[0]?.id === Number(pid) }];
  });
  const st = d.stats;
  const stacks = getStackPayload(dash);

  return (
    <DashProvider data={dash}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(dash, TITLE, DESCRIPTION) }} />
      <header className="w-top">
        <a className="w-brand" href="https://evwire.com" aria-label="EVwire">
          <i aria-hidden="true" />
          EVwire
        </a>
        <span className="w-brand-sub">Supercharger for Business</span>
        <TabNav />
      </header>

      <main>
        <div className="tab-dash" id="dashboard">
          <Wall groups={d.groups} openSites={st.openSites} stalls={st.stalls} upcoming={st.upcoming} operators={st.operators} asOf={st.openAsOf} flights={flights}>
            <DashFrame />
          </Wall>
          <DashSections />
        </div>

        <div className="tab-charts">
          <ChartsTab charts={charts} host="sfb.evwire.com" />
        </div>

        <div className="tab-hosts" id="stories-tab">
          <StoryStacks data={stacks} />
        </div>
      </main>

      <footer className="w-foot">
        <div className="w-wrap">
          <a className="w-brand" href="https://evwire.com" aria-label="EVwire">
            <i aria-hidden="true" />
            EVwire
          </a>
          <nav aria-label="Footer">
            <a href="#dashboard">The map and dashboard</a>
            <a href="#charts">Charts</a>
            <a href="#stories">Story stacks</a>
            <a href="/operators">Operators</a>
            <a href="https://evwire.com/t/tesla-third-party-superchargers" target="_blank" rel="noopener">
              Our Supercharger stories
            </a>
            <a href="https://evwire.com/subscribe" target="_blank" rel="noopener">
              Subscribe
            </a>
          </nav>
          <p>
            Source: Tesla, open sites as of {st.openAsOf}.
          </p>
        </div>
      </footer>
    </DashProvider>
  );
}
