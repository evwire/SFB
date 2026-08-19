import { getSiteData } from "@/lib/data";
import { getFeed } from "@/lib/feed";
import MapExplorer from "@/components/MapExplorer";
import Dashboard from "@/components/Dashboard";
import Feed from "@/components/Feed";
import SiteTable from "@/components/SiteTable";
import Subscribe from "@/components/Subscribe";
import Brandmark from "@/components/Brandmark";
import { fmtDate } from "@/lib/style";

// Five minutes, matching the Events project. Content urgency here is a new site
// landing, which happens weekly at most, but the news feed benefits.
export const revalidate = 300;

// One date, three places: the title strip, the board's attribution line and the
// footer. The board's is the one that leaves the page inside a screenshot, so it
// must not be able to disagree with the page it was taken from.
const UPDATED = "2026-08-13";

export default async function Page() {
  const { sites, aggregates, pipeline, programme, source } = await getSiteData();
  const feed = await getFeed(12);

  const sfb = sites.filter((s) => s.siteClass === "SfB");
  const open = sfb.filter((s) => s.status === "Operational").length;
  const states = new Set(sfb.map((s) => s.state)).size;

  const FAQ = [
    {
      q: "What is Tesla Supercharger for Business?",
      a: "Tesla's programme for selling Supercharger hardware to third parties. Tesla supplies the hardware, runs the software and handles commissioning and remote operations. The host funds the installation, pays for the electricity, sets its own retail price and can brand the stalls. Tesla charges an all inclusive fee of $0.10 per kWh on revenue generating sites. It launched in September 2025.",
    },
    {
      q: "What does a site cost to put in?",
      a: "Tesla's own calculator, published in April 2026, puts turnkey installation at $45,000 to $65,000 per post, with a minimum of four stalls. On top of that comes the $0.10 per kWh fee, against a 97 percent uptime guarantee and a service agreement of ten years or more.",
    },
    {
      q: `How many of these sites are there in the US?`,
      a: `Nobody outside Tesla knows, because Tesla publishes no list. We have covered ${sfb.length} US sites across ${states} states, ${open} of them open. Francis Energy alone says it has commissioned 100 stalls across 17 sites in Oklahoma, which gives you a sense of how much never gets reported. Treat any published count, including ours, as a floor.`,
    },
  ];

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
        mainEntity: FAQ.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <main id="main" tabIndex={-1}>
        {/* The strip. The numbers that used to sit here as chips are now the rail
            beside the map, so this says what the page is and gets out of the way. */}
        <section id="map" className="titlestrip shell rise">
          <div>
            <div className="eyebrow">Tesla Supercharger for Business</div>
            <h1>
              Who owns a Supercharger <span className="hero-accent">besides Tesla</span>
            </h1>
          </div>
          <p className="strip-note mono">
            Tesla started selling the hardware in September 2025.
            <br />
            Updated {fmtDate(UPDATED)}
          </p>
        </section>

        <div className="dash-band">
          <MapExplorer sites={sites} aggregates={aggregates} pipeline={pipeline} />
        </div>

        <section id="dashboard" className="shell">
          <div className="section-head">
            <h2><span className="sec-num" aria-hidden="true">01</span>The board</h2>
            <p className="section-note">Every name we have found, with its source</p>
          </div>
          <Dashboard sites={sites} aggregates={aggregates} pipeline={pipeline} asOf={UPDATED} />
        </section>

        <section id="how" className="shell">
          <div className="section-head">
            <h2><span className="sec-num" aria-hidden="true">02</span>How the programme works</h2>
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
                <div className="lead"><span className="econ-v">{programme.economics.tesla_fee}</span><span className="econ-l">Tesla&rsquo;s all-inclusive fee</span></div>
                <div><span className="econ-v">{programme.economics.uptime_guarantee}</span><span className="econ-l">uptime guarantee</span></div>
                <div><span className="econ-v">{programme.economics.minimum_stalls}</span><span className="econ-l">stall minimum per site</span></div>
              </div>
              <p className="panel-foot">{programme.economics.note}</p>
            </div>
          </div>
          <details className="excluded">
            <summary>Numbers we left off, and why</summary>
            <ul>
              {programme.excluded_figures.map((f) => <li key={f}>{f}</li>)}
            </ul>
          </details>
        </section>

        <section id="faq" className="shell">
          <div className="section-head">
            <h2><span className="sec-num" aria-hidden="true">03</span>Questions</h2>
            <p className="section-note">The three we get asked most</p>
          </div>
          <div className="faq">
            {FAQ.map((f) => (
              <details key={f.q}>
                <summary>{f.q}</summary>
                <p className="faq-a">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section id="sites" className="shell">
          <div className="section-head">
            <h2><span className="sec-num" aria-hidden="true">04</span>Every site, in full</h2>
            <p className="section-note">{sites.length} records</p>
          </div>
          <SiteTable sites={sites} />
        </section>

        <section id="news" className="shell">
          <div className="section-head">
            <h2><span className="sec-num" aria-hidden="true">05</span>Latest coverage</h2>
            <p className="section-note">Straight from the newsletter</p>
          </div>
          <Feed items={feed.items} source={feed.source} asOf={feed.asOf} />
        </section>

        <div className="shell"><Subscribe sites={sfb.length} /></div>

        <footer className="foot shell">
          <div className="foot-brand">
            <span className="dot" aria-hidden="true" />
            <Brandmark />
          </div>
          <p>
            Every record on this page links back to the story it came from. If you know of a site
            we have missed, or you spot something we got wrong,{" "}
            <a className="link" href="mailto:jaan@evuniverse.io?subject=Supercharger%20for%20Business%20map">
              send it over
            </a>{" "}
            and we will chase it down.
          </p>
          <p className="mono foot-meta">
            Coordinates come from the US Cities Database, checked against ZIP centroids. Last
            reviewed {fmtDate(UPDATED)}.
          </p>
        </footer>
      </main>
    </>
  );
}
