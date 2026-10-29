import PadShell from "@/components/pad/PadShell";
import { getPadData } from "@/lib/mock-pad";
import "@/components/pad/pad.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "SfB map, mockup 2 (local)", robots: { index: false } };

export default async function Page() {
  const data = await getPadData(true);
  return <PadShell variant={2} data={data} />;
}
