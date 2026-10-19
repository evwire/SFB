import latestChanges from "../../../data/latest-changes.json";

// Machine-readable copy of the home-page "New since last check" feed.
export const dynamic = "force-static";

export function GET() {
  return Response.json(latestChanges, {
    headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=3600" },
  });
}
