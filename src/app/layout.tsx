import type { Metadata } from "next";
import GlowPointer from "@/components/GlowPointer";
import SiteNav from "@/components/SiteNav";
import "@fontsource/fraunces/400.css";
import "@fontsource/fraunces/600.css";
import "@fontsource/fraunces/600-italic.css";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://sfb.evwire.com"),
  title: {
    default: "Tesla Supercharger for Business: every US site we have covered | EVwire",
    template: "%s | EVwire",
  },
  description:
    "A live map of every US Tesla Supercharger for Business site EVwire has reported, with a rollout dashboard, operator leaderboard, announced pipeline and the latest coverage.",
  keywords: [
    "Supercharger for Business",
    "third-party Tesla Supercharger",
    "privately owned Supercharger",
    "Tesla Supercharger map",
    "EV charging",
    "NACS",
  ],
  openGraph: {
    type: "website",
    siteName: "EVwire",
    url: "https://sfb.evwire.com",
    title: "Tesla Supercharger for Business: every US site we have covered",
    description:
      "A live map of every US Tesla Supercharger for Business site EVwire has reported, with a rollout dashboard and the latest coverage.",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "EVwire Supercharger for Business tracker" }],
  },
  twitter: {
    card: "summary_large_image",
    site: "@TheEVuniverse",
    title: "Tesla Supercharger for Business: every US site we have covered",
    description:
      "A live map of every US Tesla Supercharger for Business site EVwire has reported, with a rollout dashboard and the latest coverage.",
    images: ["/og.png"],
  },
  alternates: { canonical: "https://sfb.evwire.com" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Set the theme before first paint: a saved choice wins, otherwise
            follow the system. Inline on purpose, a deferred script would flash
            the wrong theme. Ported from the Events repo. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=localStorage.getItem('evw-theme');var d=s?s==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;if(d)document.documentElement.classList.add('dark');}catch(e){}})();`,
          }}
        />
      </head>
      <body>
        <div className="aura" aria-hidden="true" />
        <GlowPointer />
        <SiteNav />
        {children}
      </body>
    </html>
  );
}
