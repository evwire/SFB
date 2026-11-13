import type { Metadata } from "next";
import Wall from "@/components/wall/Wall";
import { Arrow } from "@/components/wall/Heroes";
import TabNav from "@/components/wall/TabNav";
import { DashProvider } from "@/components/wall/dash/DashContext";
import { DashFrame } from "@/components/wall/dash/DashFrame";
import DashSections from "@/components/wall/dash/DashSections";
import { getDashData, PHOTO_SITE } from "@/lib/mapdata";
import { makeOpColor } from "@/lib/opcolor";
import { getWallData } from "@/lib/wall";
import { builderEntries, hostEntries, strategyEntries, link } from "@/lib/wall-content";
import type { Entry } from "@/lib/wall-content";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Anyone can now own a Supercharger. Here is who already started.",
  description:
    "Gas stations, a jeweller, a car dealer, a coffee truck, a city. Who hosts and builds Tesla Supercharger for Business sites, with real photos and the stories behind them.",
};

function Refs({ entry }: { entry: Entry }) {
  if (!entry.refs.length) return null;
  return (
    <p className="w-refs">
      {entry.refs.map((r) => (
        <a key={r.n + r.text} href={link(r.n)} target="_blank" rel="noopener">
          {r.text}
        </a>
      ))}
    </p>
  );
}

function EntryList({ entries, cols }: { entries: Entry[]; cols: 2 | 4 }) {
  return (
    <ul className={`w-entries c${cols}`}>
      {entries.map((e) => (
        <li key={e.title}>
          <h3>{e.title}</h3>
          <p>{e.line}</p>
          <Refs entry={e} />
        </li>
      ))}
    </ul>
  );
}

export default async function Page() {
  const d = await getWallData();
  const dash = await getDashData();
  const color = makeOpColor(dash.operatorOrder);
  const siteById = new Map(dash.sites.filter((x) => x.region === "us" && x.phase === "open").map((x) => [x.id, x]));
  const flights = Object.entries(PHOTO_SITE).flatMap(([pid, sid]) => {
    const site = siteById.get(sid);
    if (!site) return [];
    return [{ photoId: Number(pid), siteId: sid, x: site.x, y: site.y, color: "#1b9152", cover: site.photos[0]?.id === Number(pid) }];
  });
  const st = d.stats;
  const notClassified = st.openSites - d.hostClassified;
  const maxCount = Math.max(...d.hostTypes.map((r) => r.count), notClassified);
  const nf = (n: number) => n.toLocaleString("en-US");

  return (
    <DashProvider data={dash}>
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

        <div className="tab-hosts">
        <div className="w-tabhead">
          <div className="w-wrap">
            <p className="w-eyebrow">Hosts &amp; stories</p>
            <h1 className="w-h2">Anyone can now own a Supercharger<span>.</span> Here is who already started<span>.</span></h1>
            <p className="w-lede">Who hosts and builds Tesla Supercharger for Business sites, with real photos and the stories behind them.</p>
          </div>
        </div>

        <section className="w-sec w-numbers" aria-label="The map today">
          <div className="w-wrap">
            <ul className="w-stats">
              <li>
                <b>{nf(st.openSites)}</b>
                <span>open sites</span>
              </li>
              <li>
                <b>{nf(st.stalls)}</b>
                <span>stalls</span>
              </li>
              <li>
                <b>{nf(st.operators)}</b>
                <span>operators</span>
              </li>
              <li>
                <b>{nf(st.states)}</b>
                <span>states</span>
              </li>
              <li>
                <b>{nf(st.upcoming)}</b>
                <span>upcoming</span>
              </li>
            </ul>
            <p className="w-note">
              Customer-owned Superchargers on Tesla&apos;s public Find Us map: open sites as of {st.openAsOf}, coming
              soon as of {st.upcomingAsOf}. Tesla publishes no official list of Supercharger for Business sites, so
              treat these as a floor. EVwire has written about {st.covered} of the {st.openSites} open sites.
            </p>
          </div>
        </section>

        <section className="w-sec" id="hosts">
          <div className="w-wrap">
            <p className="w-eyebrow">Hosts</p>
            <h2 className="w-h2">
              Who hosts a Supercharger<span>.</span>
            </h2>
            <p className="w-lede">
              Tesla supplies the hardware and the network. The host brings the land, pays for the power and sets the
              price. Here is who has done it, from our stories and from Tesla&apos;s map.
            </p>

            <div className="w-bars" role="list" aria-label={`Open sites by host type, ${st.openSites} sites`}>
              {d.hostTypes.map((r) => (
                <div className="w-bar" role="listitem" key={r.key}>
                  <span className="w-bar-l">{r.label}</span>
                  <span className="w-bar-t" aria-hidden="true">
                    <i style={{ width: `${(r.count / maxCount) * 100}%` }} />
                  </span>
                  <span className="w-bar-n">{r.count}</span>
                </div>
              ))}
              <div className="w-bar muted" role="listitem">
                <span className="w-bar-l">Not classified, the name and our stories do not say</span>
                <span className="w-bar-t" aria-hidden="true">
                  <i style={{ width: `${(notClassified / maxCount) * 100}%` }} />
                </span>
                <span className="w-bar-n">{notClassified}</span>
              </div>
            </div>
            <p className="w-note">
              Of the {st.openSites} open sites. We only classify a host when its name on Tesla&apos;s map or one of our
              stories makes the type obvious.
            </p>

            <EntryList entries={hostEntries(d)} cols={2} />
          </div>
        </section>

        <section className="w-art" aria-label="Wrapped Superchargers">
          <div className="w-wrap">
            <p className="w-eyebrow">Stalls as billboards</p>
            <h2 className="w-h2">
              Some hosts wrap the stall itself<span>.</span>
            </h2>
            <p className="w-lede">A guitar, a sailboat, a surfboard, a tree. Each photo opens the story.</p>
          </div>
          <div className="w-art-row">
            {d.artPhotos.map((a) => (
              <figure key={a.photo.id}>
                <a href={a.articleUrl} target="_blank" rel="noopener">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={a.photo.src}
                    width={a.photo.w}
                    height={a.photo.h}
                    alt={a.photo.alt}
                    loading="lazy"
                    style={{ objectPosition: a.photo.focus }}
                  />
                </a>
                <figcaption>
                  <b>{a.caption}</b>
                  <span>{a.where}</span>
                  <em>Photo: {a.photo.credit}</em>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>

        <section className="w-sec" id="builders">
          <div className="w-wrap">
            <p className="w-eyebrow">Builders and business models</p>
            <h2 className="w-h2">
              Who builds it, and who pays<span>.</span>
            </h2>
            <p className="w-lede">
              Tesla&apos;s published terms: the host funds the install at {d.programme.installCost} per post with a
              minimum of {d.programme.minStalls} stalls, pays for the power and sets the price. Tesla takes{" "}
              {d.programme.fee} and guarantees {d.programme.uptime} uptime (as of {d.programme.asOf.slice(0, 7)}, see{" "}
              <a href={d.programme.sourceUrl} target="_blank" rel="noopener">
                our explainer
              </a>
              ). Beyond that, almost everything is open. These are the models we have seen so far.
            </p>
            <EntryList entries={builderEntries(d)} cols={4} />
            <aside className="w-callout">
              <b>Francis Energy</b> is the volume story: a regional network retrofitting its own sites, {st.francisSites}{" "}
              sites and {st.francisStalls} stalls on today&apos;s map. It is one of {st.operators} operators.{" "}
              <a href={link(1)} target="_blank" rel="noopener">
                The Oklahoma deal
              </a>
              <a href={link(12)} target="_blank" rel="noopener">
                100 stalls
              </a>
            </aside>
          </div>
        </section>

        <section className="w-sec w-tight" id="strategies">
          <div className="w-wrap">
            <p className="w-eyebrow">Strategies</p>
            <h2 className="w-h2">
              How hosts compete for the stop<span>.</span>
            </h2>
            <EntryList entries={strategyEntries(d)} cols={4} />
          </div>
        </section>

        <section className="w-sec" id="stories">
          <div className="w-wrap">
            <p className="w-eyebrow">Our reporting</p>
            <h2 className="w-h2">
              Every site we have written about<span>.</span>
            </h2>
            <p className="w-lede">
              {d.cards.length} sites across {d.totalStories} published stories. Stall counts and prices come from
              Tesla&apos;s Find Us map (the price is for non-Tesla drivers). Another {d.otherStories} stories cover the
              programme, the market and the money.{" "}
              <a href="https://evwire.com/t/tesla-third-party-superchargers" target="_blank" rel="noopener">
                All of them on evwire.com
              </a>
              .
            </p>
            <ul className="w-cards">
              {d.cards.map((c) => (
                <li key={c.key} className={c.articles[0]?.image || c.photo ? "has-photo" : "no-photo"}>
                  {c.articles[0]?.image ? (
                    <a className="w-card-img story" href={c.articles[0].url} target="_blank" rel="noopener" tabIndex={-1} aria-hidden="true">
                      {/* our own EVwire story cover (the beehiiv post thumbnail) */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={c.articles[0].image} width={720} height={378} alt="" loading="lazy" />
                    </a>
                  ) : (
                    c.photo && (
                    <a className="w-card-img" href={c.articles[0].url} target="_blank" rel="noopener" tabIndex={-1} aria-hidden="true">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={c.photo.src}
                        width={c.photo.w}
                        height={c.photo.h}
                        alt=""
                        loading="lazy"
                        style={{ objectPosition: c.photo.focus }}
                      />
                    </a>
                    )
                  )}
                  <div className="w-card-body">
                    <p className="w-card-noun">{c.noun}</p>
                    <h3>{c.name}</h3>
                    <p className="w-card-meta">{[c.place, ...c.facts].filter(Boolean).join("  /  ")}</p>
                    <ul>
                      {c.articles.map((a) => (
                        <li key={a.n}>
                          <a href={a.url} target="_blank" rel="noopener">
                            {a.title}
                          </a>
                          <time dateTime={a.date}>{a.date}</time>
                        </li>
                      ))}
                    </ul>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="w-sec w-next">
          <div className="w-wrap">
            <h2 className="w-h2">
              {nf(st.upcoming)} more are coming<span>.</span>
            </h2>
            <p className="w-lede">
              Tesla&apos;s map lists {nf(st.upcoming)} customer-owned Superchargers as upcoming, in {st.upcomingStates}{" "}
              states.{" "}
              {st.upcomingNamed === 0
                ? "None of them names an operator or a host yet."
                : `${nf(st.upcomingNamed)} name an operator or a host.`}
            </p>
            <p>
              <a className="h-cta" href="#dashboard">
                <span>See every site on the map</span>
                <i>
                  <Arrow />
                </i>
              </a>
            </p>
          </div>
        </section>
        </div>
      </main>

      <footer className="w-foot">
        <div className="w-wrap">
          <a className="w-brand" href="https://evwire.com" aria-label="EVwire">
            <i aria-hidden="true" />
            EVwire
          </a>
          <nav aria-label="Footer">
            <a href="/map">The map and dashboard</a>
            <a href="/size">Site size</a>
            <a href="https://evwire.com/t/tesla-third-party-superchargers" target="_blank" rel="noopener">
              Our Supercharger stories
            </a>
            <a href="https://evwire.com/subscribe" target="_blank" rel="noopener">
              Subscribe
            </a>
          </nav>
          <p>
            Site data: Tesla Find Us, open sites as of {st.openAsOf}.
          </p>
        </div>
      </footer>
    </DashProvider>
  );
}
