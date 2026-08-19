import type { Metadata, Viewport } from "next";
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
    "A live map of every US Tesla Supercharger for Business site EVwire has reported, with a rollout dashboard, a profile for every operator and the latest coverage.",
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

/**
 * themeColor per scheme so the browser chrome matches the page instead of
 * flashing white above a night-mode page. The values are --paper and --night
 * from BRAND.md section 2, not new hues.
 */
export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2f5f4" },
    { media: "(prefers-color-scheme: dark)", color: "#06080b" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Both image CDNs are third-party origins hit on first paint: the nav
            lockup from beehiiv and the operator tiles from Brandfetch. Opening
            the connections early saves a DNS plus TLS round trip each. */}
        <link rel="preconnect" href="https://media.beehiiv.com" />
        <link rel="preconnect" href="https://cdn.brandfetch.io" />
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
        {/* First thing in the tab order. The nav carries eight links before the
            content starts, and this page is read by people who are here for the
            map (WCAG 2.4.1). */}
        <a className="skip-link" href="#main">Skip to the map</a>
        <div className="aura" aria-hidden="true" />
        <GlowPointer />
        <SiteNav />
        {children}
      </body>
    </html>
  );
}
