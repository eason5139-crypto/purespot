import Link from "next/link";
import { Button } from "@/components/ui/button";
export default function NotFound() {
  return (
    <main id="main-content" className="page-shell py-24 text-center">
      <p className="font-mono text-6xl text-cyan-300">404</p>
      <h1 className="my-5 text-2xl">這個角落還沒有商品</h1>
      <Button asChild>
        <Link href="/">回到專屬選物</Link>
      </Button>
    </main>
  );
}
