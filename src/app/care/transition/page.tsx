import type { Metadata } from "next";
import { FoodTransition } from "@/components/care/FoodTransition";
export const metadata: Metadata = {
  title: "換糧陪跑",
  description: "建立換糧日程，記錄每日食慾、便便與觀察。",
};
export default function Page() {
  return <FoodTransition />;
}
