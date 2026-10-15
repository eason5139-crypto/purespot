"use client";
import { useState } from "react";
import {
  Search,
  Users,
  Mail,
  Shield,
  ShieldOff,
  Calendar,
  ShoppingBag,
} from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { money, dateLabel } from "@/lib/utils";

interface Member {
  id: string;
  name: string;
  email: string;
  joinedAt: string;
  ordersCount: number;
  totalSpentNt: number;
  status: "ACTIVE" | "SUSPENDED";
  petCount: number;
}

const DEMO_MEMBERS: Member[] = [
  { id: "u1", name: "陳小玲", email: "ling@example.com", joinedAt: "2026-03-12T00:00:00Z", ordersCount: 8, totalSpentNt: 12400, status: "ACTIVE", petCount: 2 },
  { id: "u2", name: "林大明", email: "ming@example.com", joinedAt: "2026-05-20T00:00:00Z", ordersCount: 3, totalSpentNt: 3200, status: "ACTIVE", petCount: 1 },
  { id: "u3", name: "王小花", email: "hua@example.com", joinedAt: "2026-01-08T00:00:00Z", ordersCount: 15, totalSpentNt: 28500, status: "ACTIVE", petCount: 3 },
  { id: "u4", name: "張志遠", email: "yuan@example.com", joinedAt: "2026-07-01T00:00:00Z", ordersCount: 1, totalSpentNt: 980, status: "SUSPENDED", petCount: 1 },
  { id: "u5", name: "黃美惠", email: "hui@example.com", joinedAt: "2026-02-14T00:00:00Z", ordersCount: 11, totalSpentNt: 18700, status: "ACTIVE", petCount: 2 },
  { id: "u6", name: "劉俊傑", email: "jj@example.com", joinedAt: "2026-09-05T00:00:00Z", ordersCount: 2, totalSpentNt: 1960, status: "ACTIVE", petCount: 1 },
];

export default function AdminMembersPage() {
  const [members, setMembers] = useState<Member[]>(DEMO_MEMBERS);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "SUSPENDED">("ALL");

  function toggleStatus(id: string) {
    setMembers((prev) =>
      prev.map((m) =>
        m.id === id
          ? { ...m, status: m.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE" }
          : m
      )
    );
  }

  const filtered = members.filter((m) => {
    const matchSearch =
      m.name.includes(search) || m.email.includes(search);
    const matchStatus = statusFilter === "ALL" || m.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const activeCount = members.filter((m) => m.status === "ACTIVE").length;
  const totalRevenue = members.reduce((s, m) => s + m.totalSpentNt, 0);

  return (
    <div>
      <div className="mb-8">
        <span className="eyebrow">管理端</span>
        <h1 className="mt-2 text-2xl font-bold text-white">會員管理</h1>
        <p className="mt-1 text-sm text-slate-400">查看所有會員資料、消費紀錄與帳號狀態管理。</p>
      </div>

      {/* 概覽統計 */}
      <div className="grid gap-4 sm:grid-cols-3 mb-8">
        <div className="panel p-5">
          <Users size={20} className="text-cyan-400 mb-3" />
          <p className="text-xs text-slate-400">活躍會員數</p>
          <p className="mt-1 text-3xl font-mono font-bold text-white">{activeCount}</p>
        </div>
        <div className="panel p-5">
          <ShoppingBag size={20} className="text-emerald-400 mb-3" />
          <p className="text-xs text-slate-400">總訂單筆數</p>
          <p className="mt-1 text-3xl font-mono font-bold text-white">
            {members.reduce((s, m) => s + m.ordersCount, 0)}
          </p>
        </div>
        <div className="panel p-5">
          <Shield size={20} className="text-amber-400 mb-3" />
          <p className="text-xs text-slate-400">會員累計消費</p>
          <p className="mt-1 text-3xl font-mono font-bold text-white">{money(totalRevenue)}</p>
        </div>
      </div>

      {/* 篩選列 */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="搜尋姓名或 Email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-9 py-2 min-h-0"
          />
        </div>
        <div className="flex gap-2">
          {(["ALL", "ACTIVE", "SUSPENDED"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${
                statusFilter === s
                  ? "bg-cyan-500 text-slate-950"
                  : "bg-white/5 text-slate-400 hover:text-white"
              }`}
            >
              {s === "ALL" ? "全部" : s === "ACTIVE" ? "活躍" : "已停用"}
            </button>
          ))}
        </div>
      </div>

      {/* 會員列表 */}
      <div className="overflow-hidden rounded-2xl border border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-white/10 bg-white/5 text-xs text-slate-400">
            <tr>
              <th className="p-4">會員資訊</th>
              <th className="p-4">加入日期</th>
              <th className="p-4 text-center">毛孩數</th>
              <th className="p-4 text-center">訂單數</th>
              <th className="p-4 text-right">累計消費</th>
              <th className="p-4 text-right">帳號狀態</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filtered.map((m, i) => (
              <motion.tr
                key={m.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.04 }}
                className="hover:bg-white/[0.02] transition-colors"
              >
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 items-center justify-center rounded-full bg-cyan-400/10 text-cyan-300 text-sm font-semibold shrink-0">
                      {m.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-white">{m.name}</p>
                      <p className="text-xs text-slate-500 flex items-center gap-1">
                        <Mail size={10} />
                        {m.email}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="p-4">
                  <p className="text-xs text-slate-400 flex items-center gap-1">
                    <Calendar size={11} />
                    {dateLabel(m.joinedAt)}
                  </p>
                </td>
                <td className="p-4 text-center font-mono text-slate-300">{m.petCount}</td>
                <td className="p-4 text-center font-mono text-slate-300">{m.ordersCount}</td>
                <td className="p-4 text-right font-mono font-semibold text-cyan-300">{money(m.totalSpentNt)}</td>
                <td className="p-4 text-right">
                  <Button
                    size="sm"
                    variant="ghost"
                    className={`gap-1.5 h-7 text-xs ${
                      m.status === "ACTIVE"
                        ? "text-rose-400 hover:bg-rose-500/10 hover:text-rose-300"
                        : "text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300"
                    }`}
                    onClick={() => toggleStatus(m.id)}
                  >
                    {m.status === "ACTIVE" ? (
                      <><ShieldOff size={13} />停用</>
                    ) : (
                      <><Shield size={13} />啟用</>
                    )}
                  </Button>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
