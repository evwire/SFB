"use client";

import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";

export type NavKey = "map" | "operators" | "states" | "size" | "sites" | "news" | "sources";

const ITEMS: { key: NavKey; href: string; label: string; external?: boolean }[] = [
  { key: "map", href: "/", label: "Map" },
  { key: "operators", href: "/#operators", label: "Operators" },
  { key: "states", href: "/states", label: "States" },
  { key: "size", href: "/size", label: "Site size" },
  { key: "sites", href: "/#sites", label: "Sites" },
  { key: "news", href: "/news", label: "News" },
  { key: "sources", href: "/sources", label: "Sources" },
];

export default function ShellChrome({ active }: { active: NavKey }) {
  return (
    <header className="chrome chrome-paper">
      <div className="chrome-flush">
        <a className="brand" href="https://evwire.com" aria-label="EVwire">
          <img className="brand-logo" src="/evwire-wordmark.png" alt="EVwire" />
        </a>
        <nav className="topnav topnav-center" aria-label="Primary">
          {ITEMS.map((it) => {
            const isActive = it.key === active;
            const cls = isActive ? "nav-on" : undefined;
            const cur = isActive ? ("page" as const) : undefined;
            if (it.href.startsWith("/#") || (it.href === "/" && active === "map")) {
              return (
                <a key={it.key} href={it.href} className={cls} aria-current={cur}>
                  {it.label}
                </a>
              );
            }
            return (
              <Link key={it.key} href={it.href} className={cls} aria-current={cur}>
                {it.label}
              </Link>
            );
          })}
        </nav>
        <ThemeToggle />
      </div>
    </header>
  );
}
