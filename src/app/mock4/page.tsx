import Scrolly from "@/components/pad/Scrolly";
import { getPadData } from "@/lib/mock-pad";
import "@/components/pad/pad.css";
import "@/components/pad/scrolly.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "SfB map, mockup 4: scrollytelling (local)", robots: { index: false } };

export default async function Page() {
  const data = await getPadData(true);
  return <Scrolly data={data} />;
}
