"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import ThemeSwitch from "./ThemeSwitch";
import type { Tab } from "./dash/DashContext";

const HOST_HASHES = ["hosts", "builders", "strategies", "stories", "coming"];

/** Three views on one page: the map dashboard, the charts, and the host-type stories. The choice lives on <html data-tab>. */
export default function TabNav() {
  const [tab, setTab] = useState<Tab>("dash");
  const nav = useRef<HTMLElement>(null);

  // the sliding thumb under the active tab: measured, because the tabs are different widths (and "Hosts" shortens on a phone)
  useLayoutEffect(() => {
    const el = nav.current;
    if (!el) return;
    const place = () => {
      const b = el.querySelector<HTMLElement>('.w-tab[aria-pressed="true"]');
      if (b) {
        el.style.setProperty("--tx", `${b.offsetLeft}px`);
        el.style.setProperty("--tw", `${b.offsetWidth}px`);
        el.dataset.ready = "1";
      }
    };
    place();
    const ro = new ResizeObserver(place);
    ro.observe(el);
    document.fonts?.ready.then(place);
    return () => ro.disconnect();
  }, [tab]);

  useEffect(() => {
    const apply = (scroll: boolean) => {
      const h = location.hash.replace("#", "");
      const t: Tab = HOST_HASHES.includes(h) ? "hosts" : h === "charts" ? "charts" : "dash";
      document.documentElement.dataset.tab = t;
      setTab(t);
      window.dispatchEvent(new Event("dz-tab"));
      if (scroll && t !== "dash") {
        requestAnimationFrame(() => {
          const el = h === "hosts" || h === "charts" ? null : document.getElementById(h);
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

  const go = (t: Tab) => {
    document.documentElement.dataset.tab = t;
    history.replaceState(null, "", t === "hosts" ? "#hosts" : t === "charts" ? "#charts" : location.pathname + location.search);
    setTab(t);
    window.dispatchEvent(new Event("dz-tab"));
    window.scrollTo(0, 0);
  };

  return (
    <>
      <nav aria-label="Primary" className="w-tabs" ref={nav}>
        <i className="w-thumb" aria-hidden="true" />
        <button type="button" className="w-tab" aria-pressed={tab === "dash"} onClick={() => go("dash")}>
          Dashboard
        </button>
        <button type="button" className="w-tab" aria-pressed={tab === "charts"} onClick={() => go("charts")}>
          Charts
        </button>
        <button type="button" className="w-tab" aria-pressed={tab === "hosts"} onClick={() => go("hosts")}>
          <span className="tl">Hosts &amp; stories</span>
          <span className="ts">Hosts</span>
        </button>
      </nav>
      <ThemeSwitch />
    </>
  );
}
