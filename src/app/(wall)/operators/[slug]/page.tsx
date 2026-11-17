import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDashData } from "@/lib/mapdata";
import { getProfiles, profileBySlug, seoTitle, seoDescription, profileJsonLd, shapesIn, rangeText, fmtDay, SITE, FRANCIS, type Profile } from "@/lib/operators";
import { OpTop, OpFoot, Avatar, ArrowIcon, PlayIcon } from "@/components/profiles/OpChrome";
import SitesMap, { HeroMap } from "@/components/profiles/SitesMap";

export const revalidate = 300;
export const dynamicParams = false;

export async function generateStaticParams() {
  return getProfiles(await getDashData()).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const d = await getDashData();
  const p = profileBySlug(d, params.slug);
  if (!p) return {};
  const title = seoTitle(p);
  const description = seoDescription(p, p.region === "eu" ? d.asOf.eu : d.asOf.us);
  const url = `${SITE}/operators/${p.slug}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { type: "profile", title, description, url },
    twitter: { title, description },
  };
}

const plural = (n: number, one: string, many = one + "s") => `${n} ${n === 1 ? one : many}`;

function Facts({ p, asOf }: { p: Profile; asOf: string }) {
  const f = p.facts;
  if (!f)
    return (
      <p className="op-nofacts">
        Tesla&apos;s map lists no open site under this name (as of {asOf}), so this page has no Tesla facts and no map pins.
      </p>
    );
  return (
    <>
      <dl className="op-facts">
        <div>
          <dt>Sites</dt>
          <dd>{f.sites}</dd>
        </div>
        <div>
          <dt>Stalls</dt>
          <dd>{f.stalls}</dd>
          <span className="op-posts" aria-hidden="true">
            {Array.from({ length: Math.min(f.stalls, 120) }, (_, i) => (
              <i key={i} />
            ))}
          </span>
        </div>
        {f.kw != null && (
          <div>
            <dt>Power</dt>
            <dd>
              <small style={{ marginLeft: 0 }}>up to</small>
              {f.kw}
              <small>kW</small>
            </dd>
          </div>
        )}
        {f.tesla && (
          <div>
            <dt>Tesla owners pay</dt>
            <dd>
              {rangeText(f.tesla)}
              <small>/kWh</small>
            </dd>
          </div>
        )}
        {f.other && (
          <div>
            <dt>Other EVs pay</dt>
            <dd>
              {rangeText(f.other)}
              <small>/kWh</small>
            </dd>
          </div>
        )}
        <div>
          <dt>{p.region === "eu" ? "Country" : "Region"}</dt>
          <dd className="txt">{p.region === "eu" ? p.places : "United States"}</dd>
        </div>
      </dl>
      <p className="op-src">
        <span>Source: Tesla · open customer-owned sites as of {asOf}</span>
        <span>Energy rate per kWh as Tesla lists it{f.idle ? `; congestion fees ${f.idle} not included` : ""}</span>
      </p>
    </>
  );
}

export default async function Page({ params }: { params: { slug: string } }) {
  const d = await getDashData();
  const all = getProfiles(d);
  const p = profileBySlug(d, params.slug);
  if (!p) notFound();
  const asOf = p.region === "eu" ? d.asOf.eu : d.asOf.us;
  const bySlug = new Map(all.map((x) => [x.slug, x]));
  const plain = p.name === FRANCIS; // Francis stays plain: facts, sites, article links; no hero photo, pull quote, quotes or gallery
  const photo = plain ? undefined : p.photos[0];
  const firstQ = p.stories.flatMap((s) => s.quotes).find((q) => q.speaker && !q.excerpt);
  const pull = p.stack && p.name !== FRANCIS ? firstQ : undefined;
  const shapes = p.region && p.vb ? shapesIn(p.region, p.vb) : [];
  const nm = p.alias ? `${p.name} (${p.alias})` : p.name;
  const dateModified = new Date().toISOString().slice(0, 10);

  return (
    <div className="w-wrap">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: profileJsonLd(p, dateModified) }} />
      <OpTop here="profile" />
      <nav className="op-crumb" aria-label="Breadcrumb">
        <a href="/operators">Operators</a>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{p.name}</span>
      </nav>
      <main>
        <section className="op-hero" aria-label={nm}>
          <div>
            <p className="w-eyebrow">{p.kind === "story" ? "Operator · in EVwire stories" : `Operator · ${p.region === "eu" ? "Europe" : "United States"}`}</p>
            <h1>
              {p.name}
              {p.alias && <span className="alias">({p.alias})</span>}
            </h1>
            {p.facts ? (
              <p className="op-sub">
                <b>
                  {plural(p.facts.sites, "site")} · {plural(p.facts.stalls, "stall")}
                </b>{" "}
                in {p.places}
                {p.hosts.length > 0 && (
                  <>
                    <br />
                    Hosts: {p.hosts.slice(0, 3).join(", ")}
                    {p.hosts.length > 3 ? ` and ${p.hosts.length - 3} more` : ""}
                  </>
                )}
              </p>
            ) : (
              <p className="op-sub">
                <b>{plural(p.stories.length, "EVwire story", "EVwire stories")}</b> · {plural(p.quotes, "quote")}
              </p>
            )}
            <div className="op-cta">
              {p.stack && (
                <a className="op-watch" href={`/?stack=${p.stack}#stories`}>
                  <span className="tile" style={{ backgroundImage: `url(${photo?.src ?? p.stories[0]?.cover ?? ""})` }}>
                    <PlayIcon />
                  </span>
                  <span>
                    Watch their story
                    <small>
                      {plural(p.quotes, "quote")} · {plural(p.stories.length, "article")}
                    </small>
                  </span>
                </a>
              )}
              {p.sites.length > 0 && (
                <a className="op-ghost" href="#sites">
                  {p.sites.length === 1 ? "The site" : `All ${p.sites.length} sites`} <ArrowIcon />
                </a>
              )}
              {p.stories.length > 0 && !p.stack && (
                <a className="op-ghost" href="#story">
                  EVwire stories <ArrowIcon />
                </a>
              )}
            </div>
          </div>
          {photo ? (
            <figure className="op-hv">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.src} alt={photo.alt} style={{ objectPosition: photo.focus }} width={photo.w} height={photo.h} />
              <figcaption>Photo: {photo.credit}</figcaption>
              {pull && (
                <blockquote>
                  <p>“{pull.text}”</p>
                  <cite>{pull.speaker}</cite>
                </blockquote>
              )}
            </figure>
          ) : p.vb && p.sites.length ? (
            <div className="op-hv map">
              <HeroMap sites={p.sites} shapes={shapes} vb={p.vb} name={p.name} />
            </div>
          ) : (
            <div className="op-hv empty">No photo yet</div>
          )}
        </section>

        <Facts p={p} asOf={asOf} />

        {p.sites.length > 0 && p.vb && (
          <section className="op-sec" id="sites" aria-labelledby="h-sites">
            <div className="op-sh">
              <h2 id="h-sites">Sites</h2>
              <p>Each pin is one site on Tesla&apos;s map</p>
            </div>
            <SitesMap sites={p.sites} shapes={shapes} vb={p.vb} eu={p.region === "eu"} withMap={!!photo} name={p.name} />
          </section>
        )}

        <section className="op-sec" id="story" aria-labelledby="h-story">
          <div className="op-sh">
            <h2 id="h-story">In EVwire stories</h2>
            {p.stories.length > 0 && (
              <p>
                {plural(p.stories.length, "article")} · {fmtDay(p.stories[0].date)}
                {p.stories.length > 1 ? ` – ${fmtDay(p.stories[p.stories.length - 1].date)}` : ""}
              </p>
            )}
          </div>
          {p.stories.length ? (
            <div className="op-tl">
              {p.stories.map((a) => (
                <article className="op-art" key={a.n}>
                  {a.cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.cover} alt="" width={720} height={450} loading="lazy" />
                  ) : (
                    <span />
                  )}
                  <div>
                    <time dateTime={a.date}>{fmtDay(a.date)}</time>
                    <h3>{a.title}</h3>
                    {!plain && a.quotes.map((q) => (
                      <blockquote key={q.text}>
                        <p>
                          {q.excerpt ? "…" : "“"}
                          {q.text}
                          {q.excerpt ? "…" : "”"}
                        </p>
                        {q.speaker && <cite>{q.speaker}</cite>}
                      </blockquote>
                    ))}
                    <a className="op-read" href={a.url} target="_blank" rel="noopener">
                      Read the article <ArrowIcon />
                    </a>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="op-none">
              <i aria-hidden="true" />
              No EVwire story yet.
            </p>
          )}
        </section>

        {!plain && (p.photos.length > 1 || (p.photos.length === 1 && !photo)) && (
          <section className="op-sec" aria-labelledby="h-photos">
            <div className="op-sh">
              <h2 id="h-photos">Photos</h2>
              <p>{p.photos.length}</p>
            </div>
            <div className="op-gal" tabIndex={0} aria-label={`Photos of ${p.name}`}>
              {p.photos.map((ph) => (
                <figure key={ph.id}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={ph.src} alt={ph.alt} width={ph.w} height={ph.h} loading="lazy" style={{ objectPosition: ph.focus }} />
                  <figcaption>Photo: {ph.credit}</figcaption>
                </figure>
              ))}
            </div>
          </section>
        )}

        {p.related.length > 0 && (
          <section className="op-sec" aria-labelledby="h-rel">
            <div className="op-sh">
              <h2 id="h-rel">Related operators</h2>
            </div>
            <div className="op-rel">
              {p.related.map((r) => {
                const q = bySlug.get(r.slug)!;
                return (
                  <a key={r.slug} href={`/operators/${q.slug}`}>
                    <Avatar p={q} />
                    <span style={{ minWidth: 0 }}>
                      <em>{r.why}</em>
                      <b>{q.name}</b>
                      <small>
                        {q.facts ? `${plural(q.facts.sites, "site")} · ${plural(q.facts.stalls, "stall")}` : "Stories only"}
                        {q.stories.length ? " · story" : ""}
                      </small>
                    </span>
                  </a>
                );
              })}
            </div>
          </section>
        )}
      </main>
      <OpFoot asOf={asOf} stories={p.stories.length > 0} />
    </div>
  );
}
