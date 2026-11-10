import type { Metadata } from "next";
import { TripPackingDesk } from "@/components/care/TripPackingDesk";
export const metadata: Metadata = { title: "旅前打包桌", description: "依毛孩、目的地與出門時間，整理可儲存及分享的隨行用品清單。" };
export default async function Page({ searchParams }: { searchParams: Promise<{ plan?: string }> }) {
  const { plan } = await searchParams;
  return <TripPackingDesk sharedPlan={plan ?? ""} />;
}
