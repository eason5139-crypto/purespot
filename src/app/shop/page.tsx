import type { Metadata } from "next";
import { Storefront } from "@/components/shop/Storefront";

export const metadata: Metadata = {
  title: "精品商城｜PURESPOT",
  description: "依毛孩年齡、體重與過敏原，智慧篩選最適合的天然主食。7C 透明成分，循環補貨享 9 折優惠。",
};

export default function ShopPage() {
  return <Storefront />;
}
