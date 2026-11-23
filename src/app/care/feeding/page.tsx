import type { Metadata } from "next";
import { FeedingClockSimulator } from "@/components/shop/FeedingClockSimulator";
export const metadata: Metadata = { title: "一日餵食時鐘" };
export default function FeedingPage() { return <main id="main-content" className="page-shell py-12"><h1 className="editorial-title mb-8 text-3xl text-[#18344c]">一日餵食時鐘</h1><FeedingClockSimulator /></main>; }
