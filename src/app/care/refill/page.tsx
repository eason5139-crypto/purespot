import type { Metadata } from "next";
import { RefillForecast } from "@/components/care/RefillForecast";
export const metadata: Metadata = {
  title: "補貨天氣預報",
  description: "依毛孩份量與家中食物存量，估算下一次補貨時間。",
};
export default function Page() {
  return <RefillForecast />;
}
