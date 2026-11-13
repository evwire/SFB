import type { ReactNode } from "react";

/** The hero treatments. Only the one picked by ?hero= (html[data-hero]) is shown; see hero.css. */

export function Arrow() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 8h9M8.5 4l4 4-4 4" />
    </svg>
  );
}

function Cta({ className = "" }: { className?: string }) {
  return (
    <a className={`h-cta ${className}`} href="#dashboard">
      <span>See every site</span>
      <i>
        <Arrow />
      </i>
    </a>
  );
}

function More() {
  return (
    <a className="h-more" href="#stories">
      Read our stories
    </a>
  );
}

export default function Heroes({
  openSites,
  operators,
  asOf,
  lensWorld,
}: {
  openSites: number;
  operators: number;
  asOf: string;
  lensWorld: ReactNode;
}) {
  const sub = `${openSites} open sites and ${operators} operators on Tesla's map. These are real photos from our reporting.`;
  return (
    <div className="w-hero">
      {/* A: giant type straight on a dimmed, desaturated wall */}
      <div className="hero hero-a">
        <div className="a-veil" aria-hidden="true" />
        <h1>
          <span>Anyone can own</span>
          <span>a Supercharger.</span>
          <span className="a-em">Here is who did.</span>
        </h1>
        <div className="a-foot">
          <p>{sub}</p>
          <div className="a-links">
            <Cta />
            <More />
          </div>
        </div>
      </div>

      {/* B: headline knocked out of a paper field, the field splits into the wall on scroll */}
      <div className="hero hero-b">
        <h1 className="sr-only">Anyone can own a Supercharger. Here is who did.</h1>
        <div className="b-dim" aria-hidden="true" />
        <div className="b-half b-top" aria-hidden="true">
          <p className="b-ko">
            <span>Anyone can own</span>
            <span>a Supercharger.</span>
          </p>
        </div>
        <div className="b-half b-bot" aria-hidden="true">
          <p className="b-ko">
            <span>Anyone can own</span>
            <span>a Supercharger.</span>
          </p>
        </div>
        <div className="b-copy">
          <p className="b-em" aria-hidden="true">Here is who did.</p>
          <p className="b-sub">{sub}</p>
          <div className="b-links">
            <Cta />
            <More />
          </div>
        </div>
      </div>

      {/* C: editorial masthead band with the live numerals */}
      <div className="hero hero-c">
        <div className="c-band">
          <div className="c-kicker">
            <span>Supercharger for Business</span>
            <span className="c-date">Tesla Find Us, open sites as of {asOf}</span>
          </div>
          <div className="c-main">
            <div className="c-head">
              <h1>
                Anyone can own a Supercharger. <em>Here is who did.</em>
              </h1>
              <p>
                Gas stations, a jeweller, a car dealer, a coffee truck, a city. Real photos from our reporting, sorted
                by who hosts them as you scroll.
              </p>
              <div className="c-links">
                <a className="c-btn" href="#dashboard">
                  See every site <Arrow />
                </a>
                <a className="c-btn ghost" href="#stories">
                  Read our stories
                </a>
              </div>
            </div>
            <dl className="c-nums">
              <div>
                <dt>open sites on Tesla&apos;s map</dt>
                <dd>{openSites}</dd>
              </div>
              <div>
                <dt>operators</dt>
                <dd>{operators}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      {/* D: Liquid Glass lens */}
      <div className="hero hero-d">
        <div className="d-lens">
          <span className="d-ring" aria-hidden="true" />
          <span className="d-body" aria-hidden="true" />
          <span className="d-spec" aria-hidden="true" />
          <div className="d-copy">
            <h1>
              Anyone can own a Supercharger. <em>Here is who did.</em>
            </h1>
            <p>
              {openSites} open sites, {operators} operators. Real photos from our reporting.
            </p>
            <div className="d-links">
              <Cta />
              <More />
            </div>
          </div>
        </div>
      </div>

      {/* E: clear Liquid Glass lens. The lens holds a live, magnified copy of the wall (lensWorld) that the
          SVG filter bends at the rim, so the photos stay sharp and in colour behind it. */}
      <div className="hero hero-e">
        <div className="e-lens">
          <div className="e-glass" aria-hidden="true">
            <div className="e-mag">
              <div className="w-world e-world">{lensWorld}</div>
            </div>
          </div>
          <span className="e-tint" aria-hidden="true" />
          <span className="e-edge" aria-hidden="true" />
          <span className="e-rim" aria-hidden="true" />
          <div className="e-copy">
            <h1>
              Anyone can own a Supercharger. <em>Here is who did.</em>
            </h1>
            <p>
              {openSites} open sites, {operators} operators. Real photos from our reporting.
            </p>
            <div className="e-links">
              <a className="e-cue" href="#dashboard" aria-label="Scroll down to the map of every site">
                <span className="e-mouse" aria-hidden="true">
                  <b />
                </span>
                <span className="e-cue-t">
                  Scroll down
                  <small>Watch every photo find its site</small>
                </span>
              </a>
              <a className="e-mini" href="#dashboard">
                See every site
                <Arrow />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
