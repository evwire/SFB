"use client";

import { useEffect, useState } from "react";
import ThemeSwitch from "./ThemeSwitch";

const HOST_HASHES = ["hosts", "builders", "strategies", "stories", "coming"];

/** Two views on one page: the map dashboard, and the host-type stories. The choice lives on <html data-tab>. */
export default function TabNav() {
  const [tab, setTab] = useState<"dash" | "hosts">("dash");

  useEffect(() => {
    const apply = (scroll: boolean) => {
      const h = location.hash.replace("#", "");
      const t = HOST_HASHES.includes(h) ? "hosts" : "dash";
      document.documentElement.dataset.tab = t;
      setTab(t);
      window.dispatchEvent(new Event("dz-tab"));
      if (scroll && t === "hosts") {
        requestAnimationFrame(() => {
          const el = h === "hosts" ? null : document.getElementById(h);
          if (el) el.scrollIntoView();
          else window.scrollTo(0, 0);
        });
      }
    };
    apply(true);
    const onHash = () => apply(true);
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const go = (t: "dash" | "hosts") => {
    document.documentElement.dataset.tab = t;
    history.replaceState(null, "", t === "hosts" ? "#hosts" : location.pathname + location.search);
    setTab(t);
    window.dispatchEvent(new Event("dz-tab"));
    window.scrollTo(0, 0);
  };

  return (
    <>
      <nav aria-label="Primary" className="w-tabs">
        <button type="button" className="w-tab" aria-pressed={tab === "dash"} onClick={() => go("dash")}>
          Dashboard
        </button>
        <button type="button" className="w-tab" aria-pressed={tab === "hosts"} onClick={() => go("hosts")}>
          Hosts &amp; stories
        </button>
      </nav>
      <ThemeSwitch />
    </>
  );
}
