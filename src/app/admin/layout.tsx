import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { getAdminSession } from "@/server/adminAuth";

export const metadata: Metadata = {
  title: { default: "PURESPOT 後台管理", template: "%s｜PURESPOT Admin" },
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await getAdminSession();
  if (!admin) redirect("/admin-login?next=/admin");

  return (
    <div className="admin-shell flex min-h-screen bg-[#1b120e]">
      <AdminSidebar adminEmail={admin.email} />
      <div className="flex-1 flex flex-col min-w-0 pt-14 lg:pt-0">
        <main id="main-content" className="flex-1 p-6 lg:p-8 overflow-auto">
          {children}
        </main>
        <footer className="border-t border-[#f4a261]/10 px-8 py-3 text-xs text-[#876f63]">
          PURESPOT 營運管理中心 · 僅限授權管理員存取
        </footer>
      </div>
    </div>
  );
}
