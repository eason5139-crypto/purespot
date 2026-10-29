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
  Download,
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

type OrderStatus =
  | "PENDING_PAYMENT"
  | "PAID"
  | "PROCESSING"
  | "DISPATCHED"
  | "COMPLETED"
  | "CANCELLED";

interface Order {
  id: string;
  status: OrderStatus;
  totalNt: number;
  createdAt: string;
  items: OrderItem[];
  customerName?: string;
  customerEmail?: string;
}

const STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; color: string; icon: React.ComponentType<{ size?: number; className?: string }> }
> = {
  PENDING_PAYMENT: {
    label: "待付款",
    color: "text-[#8a5a14] bg-[#fdf6ea] border-[#e2a84c]/30",
    icon: Clock,
  },
  PAID: {
    label: "已付款",
    color: "text-[#5b7b63] bg-[#eef0e8] border-[#68856b]/30",
    icon: CheckCircle2,
  },
  PROCESSING: {
    label: "備貨中",
    color: "text-[#5e544a] bg-[#f5ede3] border-[#d9cfc3]",
    icon: ShoppingCart,
  },
  DISPATCHED: {
    label: "已出貨",
    color: "text-[#935941] bg-[#935941]/10 border-[#935941]/30",
    icon: Truck,
  },
  COMPLETED: {
    label: "已完成",
    color: "text-[#425847] bg-[#eef0e8] border-[#68856b]/30",
    icon: CheckCircle2,
  },
  CANCELLED: {
    label: "已取消",
    color: "text-rose-700 bg-rose-50 border-rose-200",
    icon: XCircle,
  },
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/orders");
      if (res.ok) {
        const data = (await res.json()) as { orders?: Order[] };
        setOrders(data.orders || []);
      }
    } catch {
      // 保持空陣列
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchOrders();
  }, []);

  async function updateStatus(orderId: string, newStatus: OrderStatus) {
    try {
      const res = await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, status: newStatus }),
      });
      if (res.ok) {
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o)),
        );
      } else {
        alert("狀態更新失敗，請檢查權限");
      }
    } catch {
      alert("狀態更新失敗，請檢查網路連線");
    }
  }

  const filtered = orders.filter((o) => {
    const matchSearch =
      o.id.includes(search) ||
      (o.customerName ?? "").includes(search) ||
      (o.customerEmail ?? "").includes(search);
    const matchStatus = statusFilter === "ALL" || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const exportCsv = () => {
    if (filtered.length === 0) return;
    const headers = [
      "訂單編號",
      "顧客姓名",
      "Email",
      "訂單狀態",
      "金額NT",
      "下單時間",
      "訂購品項",
    ];
    const rows = filtered.map((o) => [
      o.id,
      o.customerName ?? "",
      o.customerEmail ?? "",
      STATUS_CONFIG[o.status]?.label ?? o.status,
      o.totalNt,
      new Date(o.createdAt).toLocaleString("zh-TW"),
      o.items.map((it) => `${it.productName}*${it.quantity}`).join("; "),
    ]);
    const csvContent =
      "\uFEFF" +
      [
        headers.join(","),
        ...rows.map((r) =>
          r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","),
        ),
      ].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `purespot_orders_${new Date().toISOString().slice(0, 10)}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <span className="eyebrow text-[#935941]">管理端</span>
          <h1 className="mt-2 text-2xl font-bold text-[#302b26]">訂單管理</h1>
          <p className="mt-1 text-sm text-[#675e53]">
            查看、篩選並更新所有消費者訂單的配送狀態，取消訂單時自動返還庫存。
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            className="gap-1.5"
            onClick={exportCsv}
            disabled={filtered.length === 0}
          >
            <Download size={14} />
            匯出 CSV ({filtered.length})
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="gap-1.5"
            onClick={() => void fetchOrders()}
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            重新整理
          </Button>
        </div>
      </div>

      {/* 篩選列 */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8a7f75]"
          />
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
            <option key={k} value={k}>
              {v.label}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="py-20 text-center">
          <div className="mx-auto size-10 animate-spin rounded-full border-2 border-[#935941] border-t-transparent" />
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[#e8ded3] bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[#e8ded3] bg-[#fcfaf7] text-xs font-semibold text-[#675e53]">
              <tr>
                <th className="p-4">訂單編號</th>
                <th className="p-4">顧客</th>
                <th className="p-4">下單時間</th>
                <th className="p-4">狀態</th>
                <th className="p-4 text-right">金額</th>
                <th className="p-4 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e8ded3]">
              {filtered.map((order, i) => {
                const cfg = STATUS_CONFIG[order.status] ?? {
                  label: order.status,
                  color: "text-[#675e53] bg-[#f5ede3] border-[#d9cfc3]",
                  icon: Clock,
                };
                const StatusIcon = cfg.icon;
                const isExpanded = expandedId === order.id;
                return (
                  <tr key={order.id} className="contents">
                    <motion.tr
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.04 }}
                      className="hover:bg-[#fbf8f4] transition-colors cursor-pointer"
                      onClick={() => setExpandedId(isExpanded ? null : order.id)}
                    >
                      <td className="p-4 font-mono text-xs text-[#675e53]">
                        {order.id}
                      </td>
                      <td className="p-4">
                        <p className="font-medium text-[#302b26]">
                          {order.customerName ?? "訪客"}
                        </p>
                        <p className="text-xs text-[#8a7f75]">
                          {order.customerEmail ?? "-"}
                        </p>
                      </td>
                      <td className="p-4 text-xs text-[#8a7f75]">
                        {dateLabel(order.createdAt)}
                      </td>
                      <td className="p-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${cfg.color}`}
                        >
                          <StatusIcon size={11} />
                          {cfg.label}
                        </span>
                      </td>
                      <td className="p-4 text-right font-mono font-semibold text-[#935941]">
                        {money(order.totalNt)}
                      </td>
                      <td className="p-4 text-right">
                        <ChevronDown
                          size={16}
                          className={`text-[#8a7f75] transition-transform inline-block ${isExpanded ? "rotate-180" : ""}`}
                        />
                      </td>
                    </motion.tr>
                    {isExpanded && (
                      <tr>
                        <td
                          colSpan={6}
                          className="bg-[#fcfaf7] border-b border-[#e8ded3]"
                        >
                          <div className="p-5 space-y-4">
                            <div>
                              <p className="text-xs font-semibold text-[#8a7f75] mb-2">
                                訂購品項
                              </p>
                              {order.items.map((item) => (
                                <div
                                  key={item.id}
                                  className="flex justify-between text-sm py-1"
                                >
                                  <span className="text-[#302b26]">
                                    {item.productName} × {item.quantity}
                                  </span>
                                  <span className="font-mono text-[#8a7f75]">
                                    {money(item.unitPriceNt * item.quantity)}
                                  </span>
                                </div>
                              ))}
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-[#8a7f75] mb-2">
                                更新訂單狀態
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {(
                                  [
                                    "PAID",
                                    "PROCESSING",
                                    "DISPATCHED",
                                    "COMPLETED",
                                    "CANCELLED",
                                  ] as OrderStatus[]
                                ).map((s) => (
                                  <Button
                                    key={s}
                                    size="sm"
                                    variant={
                                      order.status === s ? "default" : "secondary"
                                    }
                                    className="text-xs h-7"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      void updateStatus(order.id, s);
                                    }}
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
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="py-16 text-center text-[#8a7f75] text-sm"
                  >
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
