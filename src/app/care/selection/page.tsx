import type { Metadata } from "next";
import { SelectionLab } from "@/components/care/SelectionLab";
export const metadata: Metadata = {
  title: "選物實驗室",
  description: "依毛孩物種、生命階段、過敏原與預算，挑選適合的 PURESPOT 商品。",
};
export default function Page() {
  return <SelectionLab />;
}
