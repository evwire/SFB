import type { Metadata } from "next";

export const metadata: Metadata = {
  metadataBase: new URL("https://sfb.evwire.com"),
  title: {
    default: "Tesla Supercharger for Business tracker | EVwire",
    template: "%s | EVwire",
  },
  description:
    "Every customer-owned Tesla Supercharger on Tesla's map, in the US and Europe, open and upcoming, with charts and the stories behind the first owners.",
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
    title: "Tesla Supercharger for Business tracker",
    description:
      "Every customer-owned Tesla Supercharger on Tesla's map, in the US and Europe, open and upcoming, with charts and the stories behind the first owners.",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "EVwire Supercharger for Business tracker" }],
  },
  twitter: {
    card: "summary_large_image",
    site: "@TheEVuniverse",
    title: "Tesla Supercharger for Business tracker",
    description:
      "Every customer-owned Tesla Supercharger on Tesla's map, in the US and Europe, open and upcoming, with charts and the stories behind the first owners.",
    images: ["/og.png"],
  },
  alternates: { canonical: "https://sfb.evwire.com" },
  // only the production deployment may be indexed; previews and branches stay out of search
  robots: process.env.VERCEL_ENV === "production" ? { index: true, follow: true } : { index: false, follow: false },
};

/** Runs before paint: default Paper/light; dark only if user chose it. Never follows OS. */
const themeInit = `(function(){try{var t=localStorage.getItem("evwire-sfb-theme");if(t==="dark")document.documentElement.classList.add("dark");else document.documentElement.classList.remove("dark");}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
