/** Large signature illustration: a row of isometric charger posts. */
import StallLayoutIso from "@/components/StallLayoutIso";

export default function HeroPosts({
  stalls = 8,
  label,
}: {
  stalls?: number;
  label?: string;
}) {
  return (
    <div className="hero-posts-illust" aria-hidden="true">
      <StallLayoutIso stalls={stalls} color="var(--subject-on-dark)" scale={1.35} />
      {label ? <span className="hero-posts-caption">{label}</span> : null}
    </div>
  );
}
