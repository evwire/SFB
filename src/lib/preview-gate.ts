/** Soft-launch friend preview gate — shared cookie + password helpers. */

export const PREVIEW_COOKIE = "sfb_preview_ok";
export const PREVIEW_COOKIE_MAX_AGE = 60 * 60 * 24 * 14; // 14 days

/**
 * Fallback SHA-256 of the preview password when SFB_PREVIEW_PASSWORD is unset
 * (e.g. local). Prefer the env var in production.
 */
export const PREVIEW_PASSWORD_SHA256 =
  "d9755ff34ff9d0d76d82f060eaa0374a44b864f9388b5cb41e3b9f1b273a22a6";

export async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Constant-time-ish string equality (length leak OK for this gate). */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

export async function passwordMatches(password: string): Promise<boolean> {
  const fromEnv = process.env.SFB_PREVIEW_PASSWORD;
  if (fromEnv) return safeEqual(password, fromEnv);
  const digest = await sha256Hex(password);
  return safeEqual(digest, PREVIEW_PASSWORD_SHA256);
}
