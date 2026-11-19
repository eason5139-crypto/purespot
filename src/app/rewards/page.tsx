import type { Metadata } from "next";
import { MemberClub } from "@/components/account/MemberClub";

export const metadata: Metadata = {
  title: "會員點數商店｜PURESPOT 日台生活工藝選物所",
  description:
    "每消費 NT$10 累積 1 點、結帳 1 點直接折抵現金 NT$1。提供每日節氣福引搖獎、隨箱鮮食試吃包、日台生活工藝器物與價值放大折價禮券換購。",
};

export default function RewardsShopPage() {
  return (
    <main
      id="main-content"
      className="min-h-screen bg-[#faf6f0] pb-20 text-[#302b26]"
    >
      <MemberClub standalone />
    </main>
  );
}
