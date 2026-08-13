"use client";

import { useEffect } from "react";

/**
 * One delegated mousemove listener that feeds --mx/--my to whichever
 * .pill-frost element the cursor is over, powering the mouse-tracking radial
 * glow (see globals.css). No-op on touch devices.
 *
 * Ported unchanged from the Events repo.
 */
export default function GlowPointer() {
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const el = (e.target as Element | null)?.closest?.(".pill-frost") as HTMLElement | null;
      if (!el) return;
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${e.clientX - r.left}px`);
      el.style.setProperty("--my", `${e.clientY - r.top}px`);
    };
    document.addEventListener("mousemove", onMove, { passive: true });
    return () => document.removeEventListener("mousemove", onMove);
  }, []);
  return null;
}
