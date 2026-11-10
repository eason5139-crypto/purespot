import type { Metadata } from "next";
import { ExploreMissions } from "@/components/care/ExploreMissions";
export const metadata: Metadata = { title: "毛孩探索任務", description: "用三個小任務認識配方、整理外出清單，完成自己的探索護照。" };
export default function Page() { return <ExploreMissions />; }
