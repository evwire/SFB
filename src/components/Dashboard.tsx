import Board from "@/components/Board";

import type { Site, Aggregate, PipelineClaim } from "@/lib/types";

/**
 * One panel now, where there were four.
 *
 * The pipeline went first, into the operator profiles, because an announcement
 * belongs next to that operator's sites rather than in a list of futures. Then
 * the quarterly timeline and the hardware split went, because neither was worth
 * the room: the timeline said four bars of a rollout barely a year old, and the
 * hardware split said V4 nine times, not stated nine times, V3 once.
 *
 * What is left is the thing this page knows that nobody else publishes, which is
 * the complete list of who owns a Supercharger in America besides Tesla. That
 * list is built to be screenshotted, so it carries its own attribution.
 *
 * The counting rule that matters is unchanged: Francis Energy's 100 stalls across
 * 17 Oklahoma sites is an operator claim covering sites we have not individually
 * reported, so it is never folded into the site totals. It sits beside them,
 * labelled and sourced.
 */

export default function Dashboard({
  sites,
  aggregates,
  pipeline,
  asOf,
}: {
  sites: Site[];
  aggregates: Aggregate[];
  pipeline: PipelineClaim[];
  asOf: string;
}) {
  return (
    <div className="dash">
      <Board sites={sites} aggregates={aggregates} pipeline={pipeline} asOf={asOf} />

      <p className="dash-disclaimer">
        Tesla publishes no list of these sites. Nobody outside Tesla knows the real total, so
        what you are looking at is <strong>the part we have reported and checked</strong>. The
        true figure is higher. Probably by a lot.
      </p>
    </div>
  );
}
