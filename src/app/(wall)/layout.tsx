import "@fontsource-variable/funnel-display";
import "@fontsource-variable/geist";
import "@fontsource-variable/geist-mono";
import "@fontsource/fraunces/600.css";
import "@fontsource/fraunces/600-italic.css";
import "./wall.css";
import "./hero.css";
import "./dash.css";

/** Which hero treatment shows: ?hero=a|b|c|d, set on <html> before first paint. */
const DEFAULT_HERO = "e";
const heroInit = `(function(){var h="${DEFAULT_HERO}";try{var q=new URLSearchParams(location.search).get("hero");if(q&&/^[abcde]$/.test(q))h=q}catch(e){}document.documentElement.setAttribute("data-hero",h);var x=location.hash.replace("#","");document.documentElement.setAttribute("data-tab",/^(hosts|builders|strategies|stories|coming)$/.test(x)?"hosts":x==="charts"?"charts":"dash")})();`;

/** The lander has its own look and none of the tracker's chrome. */
export default function WallLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="w">
      <script dangerouslySetInnerHTML={{ __html: heroInit }} />
      {children}
    </div>
  );
}
