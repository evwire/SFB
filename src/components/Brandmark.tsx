/**
 * The EVwire logo, hotlinked from the beehiiv media library, the same file
 * evwire.com's own header serves (`EVWire_logo_main.png`, 1000x400).
 *
 * Ported from `Brandmark.tsx` in the Events repo, with the Tailwind classes
 * swapped for the `.brandmark` rules in globals.css. The reasoning is unchanged:
 * the source is a stacked lockup with the wordmark at roughly 43% of the file's
 * height and the tagline at 13%, so scaling it to fit a nav bar drops the tagline
 * under 5px and it reads as grey mush. The crop is a fixed overflow window over an
 * oversized image, showing about source y 90 to 300.
 *
 * Dark mode inverts, because the art is black and grey on transparent. The moment
 * the logo gains a colour that breaks and this needs a real light-variant file.
 *
 * Plain img rather than next/image: hotlinking through the optimizer would mean
 * adding beehiiv to remotePatterns for one 11 KB asset. The trade is that the nav
 * logo depends on beehiiv's CDN. If that ever matters, drop the file into /public.
 */
const LOGO_SRC =
  "https://media.beehiiv.com/cdn-cgi/image/fit=scale-down,format=auto,onerror=redirect,quality=80/uploads/asset/file/4201c3de-f192-4440-b04f-bb003c81e230/EVWire_logo_main.png";

export default function Brandmark({ className }: { className?: string }) {
  return (
    <span className={"brandmark" + (className ? ` ${className}` : "")}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={LOGO_SRC} alt="EVwire" width={1000} height={400} decoding="async" />
    </span>
  );
}
