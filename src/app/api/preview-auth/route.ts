import { NextRequest, NextResponse } from "next/server";
import {
  PREVIEW_COOKIE,
  PREVIEW_COOKIE_MAX_AGE,
  passwordMatches,
} from "@/lib/preview-gate";

export const runtime = "edge";

function redirectHome(req: NextRequest, status: 303 | 302 = 303) {
  const url = req.nextUrl.clone();
  url.pathname = "/";
  url.search = "";
  return NextResponse.redirect(url, status);
}

function redirectLoginError(req: NextRequest) {
  const url = req.nextUrl.clone();
  url.pathname = "/";
  url.search = "preview_err=1";
  return NextResponse.redirect(url, 303);
}

/** POST unlock — browsers follow 303 with GET, avoiding page 405 after 307. */
export async function POST(req: NextRequest) {
  let password = "";
  try {
    const form = await req.formData();
    password = String(form.get("password") ?? "");
  } catch {
    return redirectLoginError(req);
  }

  if (!(await passwordMatches(password))) {
    return redirectLoginError(req);
  }

  const res = redirectHome(req, 303);
  res.cookies.set({
    name: PREVIEW_COOKIE,
    value: "1",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: PREVIEW_COOKIE_MAX_AGE,
  });
  return res;
}

export async function GET(req: NextRequest) {
  return redirectHome(req, 303);
}
