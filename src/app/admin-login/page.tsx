import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";

export const metadata: Metadata = {
  title: "公司後台登入",
  description: "PURESPOT 公司後台登入",
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const requested = (await searchParams).next;
  const nextPath = requested?.startsWith("/admin") ? requested : "/admin";

  return (
    <main id="main-content" className="flex min-h-screen items-center justify-center bg-[#f8f5ef] px-4 py-10 text-[#25282b]">
      <div className="w-full max-w-md">
        <Link href="/" aria-label="返回 PURESPOT 首頁" className="mx-auto mb-8 flex w-fit items-center rounded-xl bg-white px-5 py-3 shadow-sm">
          <Image src="/images/brand-logo.png" alt="PURESPOT" width={172} height={44} priority className="h-auto w-[172px]" />
        </Link>
        <AdminLoginForm nextPath={nextPath} />
        <p className="mt-6 text-center text-xs text-[#69737b]">PURESPOT 公司內部使用</p>
      </div>
    </main>
  );
}
