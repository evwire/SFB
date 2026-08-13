import { NextResponse } from "next/server";

/**
 * Newsletter signup, proxied to beehiiv so the API key never reaches the browser.
 *
 * Contract (developers.beehiiv.com, verified 2026-08-13):
 *   POST /v2/publications/:publicationId/subscriptions
 *   Authorization: Bearer <key>
 *   body: { email, reactivate_existing?, send_welcome_email?, utm_source?, utm_medium? }
 *   200 on success.
 *
 * With no key configured this returns 501 and the form degrades into a link to
 * evwire.com, which is the Events behaviour. Better a working link than a button
 * that silently does nothing.
 */

const PUBLICATION_ID = "pub_25816f4e-17bd-4f6e-af09-9b73eeb5e139";

export async function POST(req: Request) {
  const key = process.env.BEEHIIV_API_KEY;
  if (!key) {
    return NextResponse.json({ error: "unconfigured" }, { status: 501 });
  }

  let email = "";
  try {
    const body = (await req.json()) as { email?: unknown };
    email = typeof body.email === "string" ? body.email.trim() : "";
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  // Deliberately loose. beehiiv does the real validation, and a regex that
  // rejects a valid address is worse than one that passes a bad one through.
  if (!email || !email.includes("@") || email.length > 320) {
    return NextResponse.json({ error: "That does not look like an email address." }, { status: 400 });
  }

  try {
    const res = await fetch(`https://api.beehiiv.com/v2/publications/${PUBLICATION_ID}/subscriptions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        reactivate_existing: false,
        send_welcome_email: true,
        utm_source: "sfb.evwire.com",
        utm_medium: "organic",
      }),
    });

    if (res.ok) return NextResponse.json({ ok: true });

    // Do not pass beehiiv's raw error text to the browser: it can name the
    // publication and the plan. Log it, show the reader something plain.
    const detail = await res.text().catch(() => "");
    console.error(`beehiiv subscribe failed, ${res.status}: ${detail.slice(0, 400)}`);
    return NextResponse.json({ error: "We could not sign you up just then." }, { status: 502 });
  } catch (err) {
    console.error("beehiiv subscribe threw", err);
    return NextResponse.json({ error: "We could not sign you up just then." }, { status: 502 });
  }
}
