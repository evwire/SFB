import "@fontsource-variable/funnel-display";
import "@fontsource-variable/geist";
import "@fontsource-variable/geist-mono";
import "./wall.css";

/** The lander has its own look and none of the tracker's chrome. */
export default function WallLayout({ children }: { children: React.ReactNode }) {
  return <div className="w">{children}</div>;
}
