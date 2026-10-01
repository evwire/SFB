import { NextRequest, NextResponse } from "next/server";

/** Soft-launch friend preview gate (Hobby-safe). SHA-256 of the preview password — not the password. */
const PREVIEW_PASSWORD_SHA256 = "d9755ff34ff9d0d76d82f060eaa0374a44b864f9388b5cb41e3b9f1b273a22a6";

const COOKIE = "sfb_preview_ok";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 14; // 14 days

async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function loginPage(error?: string): NextResponse {
  const msg = error
    ? `<p class="err" role="alert">${error}</p>`
    : `<p class="hint">This soft-launch map is password-protected while we finish it.</p>`;
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex, nofollow" />
  <title>EVwire SfB preview</title>
  <style>
    :root { color-scheme: light dark; }
    body { margin: 0; min-height: 100vh; display: grid; place-items: center;
      font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif;
      background: #0f1410; color: #f4f1ea; }
    form { width: min(22rem, 92vw); padding: 1.5rem 1.4rem; border-radius: 14px;
      background: #1a211c; border: 1px solid #2c3a31; box-shadow: 0 12px 40px rgba(0,0,0,.35); }
    h1 { font-size: 1.05rem; margin: 0 0 .35rem; font-weight: 600; }
    .hint, .err { margin: 0 0 1rem; font-size: .9rem; line-height: 1.4; opacity: .85; }
    .err { color: #f0a0a0; opacity: 1; }
    label { display: block; font-size: .8rem; margin-bottom: .35rem; opacity: .75; }
    input { width: 100%; box-sizing: border-box; padding: .7rem .75rem; border-radius: 8px;
      border: 1px solid #3a4a40; background: #0f1410; color: inherit; font-size: 1rem; }
    button { margin-top: .9rem; width: 100%; padding: .7rem .75rem; border: 0; border-radius: 8px;
      background: #1b9152; color: #fff; font-weight: 600; font-size: .95rem; cursor: pointer; }
    button:hover { filter: brightness(1.06); }
  </style>
</head>
<body>
  <form method="POST" action="/__preview_auth">
    <h1>EVwire · SfB preview</h1>
    ${msg}
    <label for="pw">Preview password</label>
    <input id="pw" name="password" type="password" autocomplete="current-password" required autofocus />
    <button type="submit">Enter</button>
  </form>
</body>
</html>`;
  return new NextResponse(html, {
    status: error ? 401 : 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === "/og.png" ||
    pathname === "/evwire-wordmark.png"
  ) {
    return NextResponse.next();
  }

  if (pathname === "/__preview_auth" && req.method === "POST") {
    const form = await req.formData();
    const password = String(form.get("password") ?? "");
    const digest = await sha256Hex(password);
    if (digest === PREVIEW_PASSWORD_SHA256) {
      const url = req.nextUrl.clone();
      url.pathname = "/";
      url.search = "";
      const res = NextResponse.redirect(url);
      res.cookies.set({
        name: COOKIE,
        value: "1",
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/",
        maxAge: COOKIE_MAX_AGE,
      });
      return res;
    }
    return loginPage("That password didn’t match. Try again.");
  }

  if (req.cookies.get(COOKIE)?.value === "1") {
    return NextResponse.next();
  }

  return loginPage();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
