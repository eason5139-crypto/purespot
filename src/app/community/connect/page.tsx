import type { Metadata } from "next";
import { SocialStudio } from "@/components/community/SocialStudio";
export const metadata: Metadata = { title: "社群分享工作室", description: "預覽 Instagram 與 LINE 的分享內容，整理草稿和通知偏好。" };
export default function Page() { return <SocialStudio />; }
