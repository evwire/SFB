import "@fontsource/fraunces/400.css";
import "@fontsource/fraunces/600.css";
import "@fontsource/fraunces/600-italic.css";
import "../globals.css";

/** The tracker routes (/map, /size) keep their own look: Fraunces, glass panels, the aura. */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="aura" aria-hidden="true" />
      {children}
    </>
  );
}
