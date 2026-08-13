"use client";

import { useEffect, useState } from "react";

/**
 * Light/dark switch. Ported from the Events repo, Tailwind classes swapped for
 * the vanilla rules in globals.css.
 *
 * The initial class is set by the inline script in layout.tsx before paint, so
 * there is no flash. This only reads it back and writes the reader's choice to
 * localStorage. Choosing a theme opts out of following the system from then on.
 */
export default function ThemeToggle() {
  const [dark, setDark] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
    setReady(true);
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("evw-theme", next ? "dark" : "light");
    } catch {
      // Private mode or storage disabled: the choice just does not persist.
    }
  }

  return (
    <button
      onClick={toggle}
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
      title={dark ? "Light theme" : "Dark theme"}
      className="pill-frost theme-toggle"
    >
      {/* Render nothing until mounted so the icon cannot contradict the theme */}
      {ready &&
        (dark ? (
          <svg viewBox="0 0 16 16" width="16" height="16" fill="none" aria-hidden="true">
            <circle cx="8" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.5" />
            <path
              d="M8 1v1.6M8 13.4V15M15 8h-1.6M2.6 8H1M12.9 3.1l-1.1 1.1M4.2 11.8l-1.1 1.1M12.9 12.9l-1.1-1.1M4.2 4.2L3.1 3.1"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        ) : (
          <svg viewBox="0 0 16 16" width="16" height="16" fill="none" aria-hidden="true">
            <path
              d="M13.5 9.9A5.8 5.8 0 0 1 6.1 2.5a5.8 5.8 0 1 0 7.4 7.4Z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </svg>
        ))}
    </button>
  );
}
