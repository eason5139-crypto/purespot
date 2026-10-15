"use client";
import { useState, useEffect } from "react";
import {
  Search,
  ShoppingCart,
  Clock,
  Truck,
  CheckCircle2,
  XCircle,
  ChevronDown,
  RefreshCw,
} from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { money, dateLabel } from "@/lib/utils";

interface OrderItem {
  id: string;
  productName: string;
  quantity: number;
  unitPriceNt: number;
}

interface Order {
  id: string;
  status: "PENDING" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELLED";
  totalNt: number;
  createdAt: string;
  items: OrderItem[];
  customerName?: string;
  customerEmail?: string;
}

const STATUS_CONFIG = {
  PENDING: { label: "待確認", color: "text-amber-300 bg-amber-400/10 border-amber-400/20", icon: Clock },
  PROCESSING: { label: "備貨中", color: "text-blue-300 bg-blue-400/10 border-blue-400/20", icon: ShoppingCart },
  SHIPPED: { label: "已出貨", color: "text-cyan-300 bg-cyan-400/10 border-cyan-400/20", icon: Truck },
  DELIVERED: { label: "已送達", color: "text-emerald-300 bg-emerald-400/10 border-emerald-400/20", icon: CheckCircle2 },
  CANCELLED: { label: "已取消", color: "text-rose-300 bg-rose-400/10 border-rose-400/20", icon: XCircle },
};

// 展示用假資料（正式環境從 /api/orders 取得）
const DEMO_ORDERS: Order[] = [
  {
    id: "PS-20261014001",
    status: "SHIPPED",
    totalNt: 1960,
    createdAt: "2026-10-14T09:30:00Z",
    customerName: "陳小玲",
    customerEmail: "ling@example.com",
    items: [
      { id: "i1", productName: "鮭魚低敏成貓糧", quantity: 2, unitPriceNt: 980 },
    ],
  },
  {
    id: "PS-20261014002",
    status: "PENDING",
    totalNt: 850,
    createdAt: "2026-10-14T14:22:00Z",
    customerName: "林大明",
    customerEmail: "ming@example.com",
    items: [
      { id: "i2", productName: "鮮雞全齡犬糧", quantity: 1, unitPriceNt: 850 },
    ],
  },
  {
    id: "PS-20261013001",
    status: "DELIVERED",
    totalNt: 2940,
    createdAt: "2026-10-13T11:05:00Z",
    customerName: "王小花",
    customerEmail: "hua@example.com",
    items: [
      { id: "i3", productName: "鮭魚低敏成貓糧", quantity: 3, unitPriceNt: 980 },
    ],
  },
  {
    id: "PS-20261012001",
    status: "PROCESSING",
    totalNt: 1700,
    createdAt: "2026-10-12T16:40:00Z",
    customerName: "張志遠",
    customerEmail: "yuan@example.com",
    items: [
      { id: "i4", productName: "鴨肉凍乾成貓糧", quantity: 1, unitPriceNt: 1200 },
      { id: "i5", productName: "鮭魚低敏成貓糧", quantity: 0, unitPriceNt: 500 },
    ],
  },
];

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>(DEMO_ORDERS);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchOrders() {
      setLoading(true);
      try {
        const res = await fetch("/api/orders");
        if (res.ok) {
          const data = await res.json() as { orders?: Order[] };
          if (Array.isArray(data.orders) && data.orders.length > 0) {
            setOrders(data.orders);
          }
        }
      } catch {
        // 使用展示資料
      } finally {
        setLoading(false);
      }
    }
    void fetchOrders();
  }, []);

  async function updateStatus(orderId: string, newStatus: Order["status"]) {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
    );
    // 實際環境應呼叫 PATCH /api/orders/:id
  }

  const filtered = orders.filter((o) => {
    const matchSearch =
      o.id.includes(search) ||
      (o.customerName ?? "").includes(search) ||
      (o.customerEmail ?? "").includes(search);
    const matchStatus = statusFilter === "ALL" || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <span className="eyebrow">管理端</span>
          <h1 className="mt-2 text-2xl font-bold text-white">訂單管理</h1>
          <p className="mt-1 text-sm text-slate-400">查看、篩選並更新所有消費者訂單的配送狀態。</p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          className="gap-1.5"
          onClick={() => window.location.reload()}
        >
          <RefreshCw size={14} />
          重新整理
        </Button>
      </div>

      {/* 篩選列 */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="搜尋訂單編號、會員姓名..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-9 py-2 min-h-0"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input w-auto min-h-0 py-2 pr-8"
        >
          <option value="ALL">全部狀態</option>
          {Object.entries(STATUS_CONFIG).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="py-20 text-center">
          <div className="mx-auto size-10 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-white/10">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-white/10 bg-white/5 text-xs text-slate-400">
              <tr>
                <th className="p-4">訂單編號</th>
                <th className="p-4">顧客</th>
                <th className="p-4">下單時間</th>
                <th className="p-4">狀態</th>
                <th className="p-4 text-right">金額</th>
                <th className="p-4 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map((order, i) => {
                const cfg = STATUS_CONFIG[order.status];
                const StatusIcon = cfg.icon;
                const isExpanded = expandedId === order.id;
                return (
                  <>
                    <motion.tr
                      key={order.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.04 }}
                      className="hover:bg-white/[0.02] transition-colors cursor-pointer"
                      onClick={() => setExpandedId(isExpanded ? null : order.id)}
                    >
                      <td className="p-4 font-mono text-xs text-slate-300">{order.id}</td>
                      <td className="p-4">
                        <p className="text-white">{order.customerName ?? "訪客"}</p>
                        <p className="text-xs text-slate-500">{order.customerEmail ?? "-"}</p>
                      </td>
                      <td className="p-4 text-xs text-slate-400">{dateLabel(order.createdAt)}</td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs ${cfg.color}`}>
                          <StatusIcon size={11} />
                          {cfg.label}
                        </span>
                      </td>
                      <td className="p-4 text-right font-mono font-semibold text-cyan-300">{money(order.totalNt)}</td>
                      <td className="p-4 text-right">
                        <ChevronDown
                          size={16}
                          className={`text-slate-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                        />
                      </td>
                    </motion.tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan={6} className="bg-white/[0.02] border-b border-white/5">
                          <div className="p-5 space-y-4">
                            <div>
                              <p className="text-xs text-slate-500 mb-2">訂購品項</p>
                              {order.items.map((item) => (
                                <div key={item.id} className="flex justify-between text-sm py-1">
                                  <span className="text-slate-300">{item.productName} × {item.quantity}</span>
                                  <span className="font-mono text-slate-400">{money(item.unitPriceNt * item.quantity)}</span>
                                </div>
                              ))}
                            </div>
                            <div>
                              <p className="text-xs text-slate-500 mb-2">更新配送狀態</p>
                              <div className="flex flex-wrap gap-2">
                                {(["PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"] as Order["status"][]).map((s) => (
                                  <Button
                                    key={s}
                                    size="sm"
                                    variant={order.status === s ? "default" : "ghost"}
                                    className="text-xs h-7"
                                    onClick={() => void updateStatus(order.id, s)}
                                    disabled={order.status === s}
                                  >
                                    {STATUS_CONFIG[s].label}
                                  </Button>
                                ))}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-500 text-sm">
                    找不到符合條件的訂單
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
