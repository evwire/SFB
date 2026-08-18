"use client";

import { useRef, useState } from "react";

type State = "idle" | "sending" | "done" | "error" | "fallback";

/**
 * Newsletter capture, ported from the Events repo.
 *
 * The pitch is two-sided on purpose: this page keeps changing as sites open, and
 * the newsletter is where the reporting behind it lives. If BEEHIIV_API_KEY is
 * not set, the form degrades into a link to evwire.com rather than failing in
 * the reader's face.
 */
export default function Subscribe({ sites }: { sites: number }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<State>("idle");
  const [message, setMessage] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (state === "sending") return;
    setState("sending");
    setMessage("");
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        setState("done");
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (res.status === 501 || data?.error === "unconfigured") {
        setState("fallback");
        return;
      }
      fail(data?.error || "That did not go through. Please try again.");
    } catch {
      fail("We could not reach the server. Check your connection and try again.");
    }
  }

  // WCAG 3.3.1: the error is announced by role="alert" and focus returns to the
  // field that needs attention, rather than leaving it wherever the submit left it.
  //
  // The button label below carries a literal U+2026 rather than an escape. That
  // is deliberate and was arrived at the hard way: the contents API resolved a
  // backslash-u escape into the character on one push and passed a doubled
  // backslash through verbatim on the next, so the escape is the fragile form
  // here, not the character. Visible non-ASCII survives this pipeline intact.
  // U+00A0 is the one that does not, because it is invisible whitespace.
  function fail(text: string) {
    setState("error");
    setMessage(text);
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  return (
    <section id="subscribe" className="subscribe glass">
      <div className="subscribe-inner">
        <div>
          <h2>Every new site, in your inbox</h2>
          <p className="subscribe-pitch">
            We add to this page as operators switch sites on. The reporting behind each one
            goes out in the EVwire newsletter first, along with the rest of the EV industry.
          </p>
          <p className="subscribe-proof mono">
            {sites} sites tracked here. Read by 14,000+ EV geeks.
          </p>
        </div>

        {state === "done" ? (
          <div className="subscribe-result" role="status" aria-live="polite">
            <p className="subscribe-result-head">You are in.</p>
            <p className="subscribe-result-sub">Check your inbox to confirm.</p>
          </div>
        ) : state === "fallback" ? (
          <div className="subscribe-result" role="status" aria-live="polite">
            <p className="subscribe-result-sub">Signups are handled on the main site.</p>
            <a className="cta" href="https://evwire.com" target="_blank" rel="noopener">
              Subscribe on EVwire
            </a>
          </div>
        ) : (
          <form onSubmit={submit} className="subscribe-form">
            <label htmlFor="sub-email" className="sr-only">
              Email address
            </label>
            <div className="subscribe-row">
              <input
                ref={inputRef}
                id="sub-email"
                name="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                spellCheck={false}
                required
                aria-invalid={state === "error"}
                aria-describedby={state === "error" ? "sub-email-error" : undefined}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
              />
              <button type="submit" className="cta" disabled={state === "sending"}>
                {state === "sending" ? "Signing you up…" : "Subscribe free"}
              </button>
            </div>
            {state === "error" && (
              <p id="sub-email-error" role="alert" className="subscribe-error">
                {message}
              </p>
            )}
          </form>
        )}
      </div>
    </section>
  );
}
