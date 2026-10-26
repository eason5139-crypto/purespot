"use client";
import { useState, useEffect } from "react";
import {
  Search,
  Users,
  Shield,
  Trash2,
  Plus,
  RefreshCw,
  ShoppingBag,
  Mail,
  Phone,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { money, dateLabel } from "@/lib/utils";

interface Member {
  id: string;
  name: string;
  email: string;
  phone?: string;
  joinedAt: string;
  ordersCount: number;
  totalSpentNt: number;
  status: "ACTIVE" | "SUSPENDED";
  petCount: number;
}

export default function AdminMembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 新增會員表單
  const [newMember, setNewMember] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
  });

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/members");
      if (res.ok) {
        const data = await res.json();
        setMembers(data.members || []);
      }
    } catch {
      // 容錯
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchMembers();
  }, []);

  const handleCreateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/admin/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newMember),
      });
      if (res.ok) {
        setIsModalOpen(false);
        setNewMember({ name: "", email: "", password: "", phone: "" });
        await fetchMembers();
      } else {
        const err = await res.json();
        setErrorMsg(err.error || "新增失敗");
      }
    } catch {
      setErrorMsg("伺服器連線失敗");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteMember = async (id: string, name: string) => {
    if (!confirm(`確定要刪除會員「${name}」嗎？此動作將一併刪除該會員的所有毛孩與訂單。`)) return;
    try {
      const res = await fetch(`/api/admin/members?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setMembers((prev) => prev.filter((m) => m.id !== id));
      } else {
        alert("刪除失敗");
      }
    } catch {
      alert("網路連線異常");
    }
  };

  const filtered = members.filter((m) => {
    return (
      m.name.includes(search) ||
      m.email.includes(search) ||
      (m.phone && m.phone.includes(search))
    );
  });

  const activeCount = members.length;
  const totalRevenue = members.reduce((s, m) => s + m.totalSpentNt, 0);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <span className="eyebrow">管理端</span>
          <h1 className="mt-2 text-2xl font-bold text-white">會員管理</h1>
          <p className="mt-1 text-sm text-slate-400">真實 Neon 資料庫會員清單，支援即時新增、查詢與刪除會員。</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" className="gap-1.5" onClick={() => void fetchMembers()}>
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            重新整理
          </Button>
          <Button size="sm" className="gap-1.5" onClick={() => setIsModalOpen(true)}>
            <Plus size={15} />
            新增會員
          </Button>
        </div>
      </div>

      {/* 概覽統計 */}
      <div className="grid gap-4 sm:grid-cols-3 mb-8">
        <div className="panel p-5">
          <Users size={20} className="text-cyan-400 mb-3" />
          <p className="text-xs text-slate-400">真實註冊會員數</p>
          <p className="mt-1 text-3xl font-mono font-bold text-white">{activeCount}</p>
        </div>
        <div className="panel p-5">
          <ShoppingBag size={20} className="text-emerald-400 mb-3" />
          <p className="text-xs text-slate-400">會員下單總數</p>
          <p className="mt-1 text-3xl font-mono font-bold text-white">
            {members.reduce((s, m) => s + m.ordersCount, 0)}
          </p>
        </div>
        <div className="panel p-5">
          <Shield size={20} className="text-amber-400 mb-3" />
          <p className="text-xs text-slate-400">會員累計總消費</p>
          <p className="mt-1 text-3xl font-mono font-bold text-white">{money(totalRevenue)}</p>
        </div>
      </div>

      {/* 搜尋列 */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="搜尋姓名、Email 或手機..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-9 py-2 min-h-0"
          />
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
              <th className="p-4 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-400">
                  <div className="mx-auto size-6 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent mb-2" />
                  載入真實會員名單中...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-500">
                  {search ? "查無符合條件的會員" : "資料庫目前尚無會員資料（點擊右上角新增會員）"}
                </td>
              </tr>
            ) : (
              filtered.map((m) => (
                <tr key={m.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="size-9 rounded-full bg-cyan-400/10 text-cyan-300 font-bold flex items-center justify-center text-sm border border-cyan-400/20">
                        {m.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-white">{m.name}</p>
                        <p className="text-xs text-slate-400">{m.email}</p>
                        {m.phone && m.phone !== "未填寫" && (
                          <p className="text-xs text-slate-500">{m.phone}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-xs text-slate-400">
                    {dateLabel(m.joinedAt)}
                  </td>
                  <td className="p-4 text-center font-mono text-slate-300">
                    {m.petCount}
                  </td>
                  <td className="p-4 text-center font-mono text-slate-300">
                    {m.ordersCount}
                  </td>
                  <td className="p-4 text-right font-mono font-medium text-cyan-300">
                    {money(m.totalSpentNt)}
                  </td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => void handleDeleteMember(m.id, m.name)}
                      className="inline-flex items-center gap-1 text-xs text-rose-400 hover:text-rose-300 px-2 py-1 rounded hover:bg-rose-500/10 transition-colors"
                      title="刪除此會員"
                    >
                      <Trash2 size={14} />
                      刪除
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 新增會員彈窗 */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-2xl border border-white/15 bg-[#0f1523] p-6 shadow-2xl relative"
            >
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute right-4 top-4 text-slate-400 hover:text-white"
              >
                ✕
              </button>

              <div className="flex items-center gap-2 mb-4 text-cyan-300">
                <Users size={20} />
                <h3 className="text-lg font-bold text-white">公司端手動建立新會員</h3>
              </div>

              {errorMsg && (
                <div className="mb-4 rounded-lg bg-rose-500/10 border border-rose-400/20 p-3 text-xs text-rose-300">
                  {errorMsg}
                </div>
              )}

              <form onSubmit={handleCreateMember} className="space-y-4">
                <div>
                  <label className="field-label">會員姓名 *</label>
                  <input
                    type="text"
                    required
                    value={newMember.name}
                    onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                    placeholder="請輸入會員姓名"
                    className="input"
                  />
                </div>
                <div>
                  <label className="field-label">電子信箱 (Email) *</label>
                  <input
                    type="email"
                    required
                    value={newMember.email}
                    onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                    placeholder="example@gmail.com"
                    className="input"
                  />
                </div>
                <div>
                  <label className="field-label">初始密碼 *</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={newMember.password}
                    onChange={(e) => setNewMember({ ...newMember, password: e.target.value })}
                    placeholder="至少 8 碼"
                    className="input font-mono"
                  />
                </div>
                <div>
                  <label className="field-label">聯絡電話（選填）</label>
                  <input
                    type="tel"
                    value={newMember.phone}
                    onChange={(e) => setNewMember({ ...newMember, phone: e.target.value })}
                    placeholder="0912345678"
                    className="input font-mono"
                  />
                </div>

                <div className="flex justify-end gap-2.5 pt-4">
                  <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
                    取消
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? "建立中..." : "確認建立會員"}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
