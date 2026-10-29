import Link from "next/link";
import { Button } from "@/components/ui/button";
export default function NotFound() {
  return (
    <main id="main-content" className="page-shell py-24 text-center">
      <p className="font-mono text-6xl font-bold text-[#935941]">404</p>
      <h1 className="my-5 text-2xl font-semibold text-[#302b26]">這個角落還沒有商品</h1>
      <Button asChild className="bg-[#935941] text-white hover:bg-[#794632]">
        <Link href="/">回到專屬選物</Link>
      </Button>
    </main>
  );
}
