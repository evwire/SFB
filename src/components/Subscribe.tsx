"use client";

import { useState } from "react";

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
      setState("error");
      setMessage(data?.error || "Something went wrong. Please try again.");
    } catch {
      setState("error");
      setMessage("Network error. Please try again.");
    }
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
          <div className="subscribe-result">
            <p className="subscribe-result-head">You are in.</p>
            <p className="subscribe-result-sub">Check your inbox to confirm.</p>
          </div>
        ) : state === "fallback" ? (
          <div className="subscribe-result">
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
                id="sub-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
              />
              <button type="submit" className="cta" disabled={state === "sending"}>
                {state === "sending" ? "Signing you up" : "Subscribe free"}
              </button>
            </div>
            {state === "error" && (
              <p role="alert" className="subscribe-error">
                {message}
              </p>
            )}
          </form>
        )}
      </div>
    </section>
  );
}
