import "@fontsource-variable/funnel-display";
import "@fontsource-variable/geist";
import "@fontsource-variable/geist-mono";
import "@fontsource/fraunces/600.css";
import "@fontsource/fraunces/600-italic.css";
import "./wall.css";
import "./hero.css";

/** Which hero treatment shows: ?hero=a|b|c|d, set on <html> before first paint. */
const DEFAULT_HERO = "d";
const heroInit = `(function(){var h="${DEFAULT_HERO}";try{var q=new URLSearchParams(location.search).get("hero");if(q&&/^[abcd]$/.test(q))h=q}catch(e){}document.documentElement.setAttribute("data-hero",h)})();`;

/** The lander has its own look and none of the tracker's chrome. */
export default function WallLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="w">
      <script dangerouslySetInnerHTML={{ __html: heroInit }} />
      {children}
    </div>
  );
}
