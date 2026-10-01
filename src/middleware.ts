import { NextRequest, NextResponse } from "next/server";
import { PREVIEW_COOKIE } from "@/lib/preview-gate";

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
  <form method="POST" action="/api/preview-auth">
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

  // Static assets + the unlock Route Handler (must accept POST itself).
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/preview-auth") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === "/og.png" ||
    pathname === "/evwire-wordmark.png"
  ) {
    return NextResponse.next();
  }

  if (req.cookies.get(PREVIEW_COOKIE)?.value === "1") {
    // Pages only serve GET/HEAD — reject leftover POST (e.g. old 307 follow).
    if (req.method !== "GET" && req.method !== "HEAD") {
      const url = req.nextUrl.clone();
      url.pathname = "/";
      url.search = "";
      return NextResponse.redirect(url, 303);
    }
    return NextResponse.next();
  }

  const err =
    req.nextUrl.searchParams.get("preview_err") === "1"
      ? "That password didn’t match. Try again."
      : undefined;
  return loginPage(err);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
