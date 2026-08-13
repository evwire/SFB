import { getSiteData } from "@/lib/data";
import { getFeed } from "@/lib/feed";
import MapExplorer from "@/components/MapExplorer";
import Dashboard from "@/components/Dashboard";
import Feed from "@/components/Feed";
import SiteTable from "@/components/SiteTable";
import { fmtDate } from "@/lib/style";

// Five minutes, matching the Events project. Content urgency here is a new site
// landing, which happens weekly at most, but the news feed benefits.
export const revalidate = 300;

export default async function Page() {
  const { sites, aggregates, pipeline, programme, source } = await getSiteData();
  const feed = await getFeed(12);

  const sfb = sites.filter((s) => s.siteClass === "SfB");
  const open = sfb.filter((s) => s.status === "Operational").length;
  const states = new Set(sfb.map((s) => s.state)).size;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Dataset",
        name: "EVwire coverage of US Tesla Supercharger for Business sites",
        description:
          "Every US Tesla Supercharger for Business site reported by EVwire, with operator, stall count, hardware generation, status, coordinate precision and source article.",
        creator: { "@type": "Organization", name: "EVwire", url: "https://evwire.com" },
        url: "https://sfb.evwire.com",
        isAccessibleForFree: true,
        license: "https://evwire.com",
        variableMeasured: ["site count", "stall count", "operator", "hardware generation", "status"],
      },
      {
        "@type": "ItemList",
        name: "US Tesla Supercharger for Business sites covered by EVwire",
        numberOfItems: sfb.length,
        itemListElement: sfb.map((s, i) => ({
          "@type": "ListItem",
          position: i + 1,
          item: {
            "@type": "Place",
            name: s.name,
            url: s.sourceUrl,
            ...(s.lat != null && s.lng != null
              ? { geo: { "@type": "GeoCoordinates", latitude: s.lat, longitude: s.lng } }
              : {}),
            address: {
              "@type": "PostalAddress",
              addressCountry: "US",
              addressRegion: s.state,
              ...(s.city ? { addressLocality: s.city } : {}),
              ...(s.address ? { streetAddress: s.address } : {}),
            },
          },
        })),
      },
      {
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: "What is Tesla Supercharger for Business?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "It is Tesla's programme for selling Supercharger hardware to third parties. Tesla supplies the hardware, runs the software and handles commissioning and remote operations. The host funds the installation, pays for electricity, sets its own retail price and can brand the stalls. Tesla charges an all inclusive fee of $0.10 per kWh on revenue generating sites. Tesla launched it in September 2025.",
            },
          },
          {
            "@type": "Question",
            name: "How much does a Supercharger for Business site cost?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Tesla's own calculator, published in April 2026, puts turnkey installation at $45,000 to $65,000 per post, with a minimum of four stalls per location. Tesla then charges $0.10 per kWh on revenue generating sites and guarantees 97 percent uptime behind a service agreement of ten years or more.",
            },
          },
          {
            "@type": "Question",
            name: "How many Supercharger for Business sites are there in the US?",
            acceptedAnswer: {
              "@type": "Answer",
              text: `Tesla does not publish a site list. EVwire has covered ${sfb.length} US sites, of which ${open} are reported open, across ${states} states. Francis Energy separately says it has commissioned 100 stalls across 17 Oklahoma sites. The real national total is higher than what any outlet has reported.`,
            },
          },
        ],
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <header className="topbar">
        <div className="shell topbar-inner">
          <a className="brand" href="https://evwire.com">
            <span className="dot" aria-hidden="true" />
            EVwire<span className="suffix">/sfb</span>
          </a>
          <nav className="topnav">
            <a href="#map">Map</a>
            <a href="#dashboard">Rollout</a>
            <a href="#sites">All sites</a>
            <a href="#news">News</a>
          </nav>
        </div>
      </header>

      <main className="shell">
        <section className="hero rise" style={{ marginTop: 40 }}>
          <div className="eyebrow">Tesla Supercharger for Business</div>
          <h1>
            Anyone can buy a Supercharger now.<br />
            <span className="hero-accent">Here is who actually did.</span>
          </h1>
          <p className="lede">
            Tesla opened its charging hardware to third parties in September 2025. Since then a
            golf club, a police department, a diamond shop and a barbecue travel center have all
            put their own logo on a Supercharger. This is every US site EVwire has reported,
            what we know about each one, and what we do not.
          </p>
          <div className="hero-stats">
            <span className="chip"><span className="swatch" style={{ background: "var(--signal)" }} />{sfb.length} sites covered</span>
            <span className="chip">{states} states</span>
            <span className="chip">{open} reported open</span>
            <span className="chip">Data source: {source === "airtable" ? "Airtable" : "committed dataset"}</span>
          </div>
        </section>

        <section id="map">
          <div className="section-head">
            <h2>The map</h2>
            <p className="section-note">Click a pin for the full record and its source</p>
          </div>
          <MapExplorer sites={sites} />
        </section>

        <section id="dashboard">
          <div className="section-head">
            <h2>The rollout, so far</h2>
            <p className="section-note">Counts describe our coverage, not the whole programme</p>
          </div>
          <Dashboard sites={sites} aggregates={aggregates} pipeline={pipeline} />
        </section>

        <section id="how">
          <div className="section-head">
            <h2>How the programme works</h2>
            <p className="section-note">Tesla&rsquo;s own published terms, {programme.economics.as_of}</p>
          </div>
          <div className="how-grid">
            <div className="dash-panel glass">
              <ul className="how-list">
                {programme.how_it_works.map((h) => <li key={h}>{h}</li>)}
              </ul>
              <p className="panel-foot">
                <a className="link" href={programme.primer_url} target="_blank" rel="noopener">
                  Our full breakdown of the pricing and the calculator
                </a>
              </p>
            </div>
            <div className="dash-panel glass">
              <div className="econ">
                <div><span className="econ-v">{programme.economics.install_cost_per_post}</span><span className="econ-l">turnkey install, per post</span></div>
                <div><span className="econ-v">{programme.economics.tesla_fee}</span><span className="econ-l">Tesla&rsquo;s all-inclusive fee</span></div>
                <div><span className="econ-v">{programme.economics.uptime_guarantee}</span><span className="econ-l">uptime guarantee</span></div>
                <div><span className="econ-v">{programme.economics.minimum_stalls}</span><span className="econ-l">stall minimum per site</span></div>
              </div>
              <p className="panel-foot">{programme.economics.note}</p>
            </div>
          </div>
          <details className="excluded">
            <summary>Figures we have deliberately left off this page</summary>
            <ul>
              {programme.excluded_figures.map((f) => <li key={f}>{f}</li>)}
            </ul>
          </details>
        </section>

        <section id="sites">
          <div className="section-head">
            <h2>Every site, in full</h2>
            <p className="section-note">{sites.length} records</p>
          </div>
          <SiteTable sites={sites} />
        </section>

        <section id="news">
          <div className="section-head">
            <h2>Latest coverage</h2>
            <p className="section-note">Everything we publish on the programme</p>
          </div>
          <Feed items={feed.items} source={feed.source} asOf={feed.asOf} />
        </section>

        <footer className="foot">
          <div className="foot-brand">
            <span className="dot" aria-hidden="true" />
            <strong>EVwire</strong>
            <span className="suffix">/sfb</span>
          </div>
          <p>
            Built from EVwire&rsquo;s own reporting. Every record links to the story it came from.
            Spotted a site we have missed, or a detail we got wrong?{" "}
            <a className="link" href="mailto:jaan@evuniverse.io?subject=Supercharger%20for%20Business%20map">
              Tell us
            </a>{" "}
            and we will chase it.
          </p>
          <p className="mono foot-meta">
            Coordinates are city centroids from the US Cities Database, cross-checked against ZIP
            centroids. Last reviewed {fmtDate("2026-08-13")}.
          </p>
        </footer>
      </main>
    </>
  );
}
