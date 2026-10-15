import type { Metadata } from "next";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

export const metadata: Metadata = {
  title: { default: "PURESPOT 後台管理", template: "%s｜PURESPOT Admin" },
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[#070B12]">
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-w-0 pt-14 lg:pt-0">
        <main id="main-content" className="flex-1 p-6 lg:p-8 overflow-auto">
          {children}
        </main>
        <footer className="border-t border-white/5 px-8 py-3 text-xs text-slate-600">
          PURESPOT Enterprise Backoffice · 僅限授權管理員存取
        </footer>
      </div>
    </div>
  );
}
