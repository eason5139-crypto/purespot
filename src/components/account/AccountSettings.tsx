"use client";

import { useEffect, useState } from "react";
import { Bell, MapPin, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { accountJson, jsonRequest, type SavedAddress } from "@/lib/accountTypes";
import type { AddressInput, Preferences } from "@/lib/accountSchemas";

const emptyAddress: AddressInput = { label: "住家", name: "", phone: "", postalCode: "", city: "", district: "", address: "", note: "", isDefault: false };
const defaultPreferences: Preferences = { orderUpdates: true, refillReminders: true, restockAlerts: true, careReminders: true };
const options: { key: keyof Preferences; title: string; detail: string }[] = [
  { key: "orderUpdates", title: "訂單與出貨", detail: "在帳戶首頁顯示訂單狀態變動。" },
  { key: "refillReminders", title: "補貨節奏", detail: "依已出貨商品與毛孩資料顯示預估補貨時間。" },
  { key: "restockAlerts", title: "收藏商品到貨", detail: "收藏商品恢復庫存時，在帳戶內提醒。" },
  { key: "careReminders", title: "照顧待辦", detail: "在節奏板顯示你為毛孩設定的提醒。" },
];

export function AccountSettings() {
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [preferences, setPreferences] = useState<Preferences>(defaultPreferences);
  const [form, setForm] = useState<AddressInput>(emptyAddress);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    try {
      const [addressData, preferenceData] = await Promise.all([
        accountJson<{ addresses: SavedAddress[] }>("/api/account/addresses"),
        accountJson<{ preferences: Preferences }>("/api/account/preferences"),
      ]);
      setAddresses(addressData.addresses); setPreferences(preferenceData.preferences); setError("");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "設定暫時無法載入"); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  async function saveAddress() {
    setBusy(true); setError("");
    try {
      await accountJson("/api/account/addresses", jsonRequest(editingId ? "PATCH" : "POST", editingId ? { id: editingId, address: form } : form));
      setShowForm(false); setEditingId(null); setForm(emptyAddress); await load(); toast.success("收件地址已儲存");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "地址儲存失敗"); }
    finally { setBusy(false); }
  }
  async function removeAddress(id: string) {
    setBusy(true); setError("");
    try { await accountJson("/api/account/addresses", jsonRequest("DELETE", { id })); await load(); toast.success("已移除收件地址"); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "地址移除失敗"); }
    finally { setBusy(false); }
  }
  async function savePreferences() {
    setBusy(true); setError("");
    try { await accountJson("/api/account/preferences", jsonRequest("PUT", preferences)); toast.success("通知偏好已儲存"); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "通知偏好儲存失敗"); }
    finally { setBusy(false); }
  }

  return <div className="space-y-9"><header><p className="text-xs font-semibold tracking-[.18em] text-[#5B93C5]">MY PREFERENCES</p><h2 className="editorial-title mt-2 text-3xl text-[#263746]">收件與通知</h2><p className="mt-2 text-sm text-[#687985]">把常用收件人存好，結帳時就能直接選；提醒會在帳戶內顯示。</p></header>
    {error && <p role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{error}</p>}{loading && <p className="text-sm text-[#687985]">正在載入設定…</p>}
    <section className="rounded-[23px] border border-[#e1d7cc] bg-white p-5 sm:p-7"><div className="flex items-center justify-between gap-3"><div><h3 className="flex items-center gap-2 text-lg font-semibold text-[#263746]"><MapPin size={19} className="text-[#5B93C5]" />常用收件地址</h3><p className="mt-1 text-xs text-[#8b918f]">最多 10 組；預設地址會優先帶入結帳頁。</p></div><button type="button" onClick={() => { setForm({ ...emptyAddress, isDefault: addresses.length === 0 }); setEditingId(null); setShowForm(true); }} className="flex min-h-10 items-center gap-1 rounded-full bg-[#315F86] px-4 text-xs font-semibold text-white"><Plus size={15} />新增地址</button></div>
      <div className="mt-5 grid gap-3 md:grid-cols-2">{addresses.map((address) => <div key={address.id} className="rounded-xl border border-[#dce6ea] bg-[#f9fbfb] p-4"><div className="flex items-center justify-between gap-2"><strong className="text-sm text-[#263746]">{address.label}</strong>{address.isDefault && <span className="rounded-full bg-[#e8f1f8] px-2 py-1 text-[11px] font-semibold text-[#315F86]">預設</span>}</div><p className="mt-3 text-sm leading-6 text-[#687985]">{address.name} · {address.phone}<br />{address.postalCode} {address.city}{address.district}{address.address}</p><div className="mt-4 flex gap-3"><button type="button" onClick={() => { setEditingId(address.id); setForm({ label: address.label, name: address.name, phone: address.phone, postalCode: address.postalCode, city: address.city, district: address.district, address: address.address, note: address.note, isDefault: address.isDefault }); setShowForm(true); }} className="text-xs font-semibold text-[#315F86]">編輯</button><button type="button" disabled={busy} onClick={() => void removeAddress(address.id)} className="flex items-center gap-1 text-xs text-rose-700"><Trash2 size={13} />移除</button></div></div>)}{!loading && addresses.length === 0 && <p className="rounded-xl bg-[#f8f5ef] p-6 text-sm text-[#8b918f]">尚未儲存地址。新增後，結帳可直接選取。</p>}</div>
      {showForm && <div className="mt-6 rounded-2xl border border-[#bcd5e9] bg-[#f3f8fb] p-5"><h4 className="font-semibold text-[#263746]">{editingId ? "編輯收件地址" : "新增收件地址"}</h4><div className="mt-4 grid gap-3 sm:grid-cols-2">{([["label", "地址名稱，例如住家"], ["name", "收件人"], ["phone", "手機號碼"], ["postalCode", "郵遞區號"], ["city", "縣市"], ["district", "鄉鎮市區"], ["address", "詳細地址"], ["note", "配送備註（選填）"]] as const).map(([key, label]) => <label key={key} className={`text-xs font-medium text-[#687985] ${key === "address" || key === "note" ? "sm:col-span-2" : ""}`}>{label}<input value={form[key]} onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))} maxLength={key === "note" || key === "address" ? 150 : 50} className="input mt-1" /></label>)}</div><label className="mt-4 flex items-center gap-2 text-sm text-[#315F86]"><input type="checkbox" checked={form.isDefault} onChange={(event) => setForm((current) => ({ ...current, isDefault: event.target.checked }))} className="size-4 accent-[#315F86]" />設為預設收件地址</label><div className="mt-5 flex gap-3"><button type="button" disabled={busy} onClick={() => void saveAddress()} className="flex min-h-11 items-center gap-2 rounded-xl bg-[#315F86] px-5 text-sm font-semibold text-white disabled:opacity-50"><Save size={15} />儲存地址</button><button type="button" onClick={() => setShowForm(false)} className="rounded-xl px-4 text-sm text-[#687985]">取消</button></div></div>}
    </section>
    <section className="rounded-[23px] border border-[#e1d7cc] bg-white p-5 sm:p-7"><h3 className="flex items-center gap-2 text-lg font-semibold text-[#263746]"><Bell size={19} className="text-[#5B93C5]" />站內提醒偏好</h3><p className="mt-2 text-xs leading-5 text-[#8b918f]">這些提醒顯示在帳戶的節奏板與相關頁面；可隨時調整。</p><div className="mt-5 divide-y divide-[#eee7de]">{options.map((option) => <label key={option.key} className="flex items-center justify-between gap-5 py-4"><span><strong className="block text-sm text-[#263746]">{option.title}</strong><span className="mt-1 block text-xs text-[#8b918f]">{option.detail}</span></span><input type="checkbox" checked={preferences[option.key]} onChange={(event) => setPreferences((current) => ({ ...current, [option.key]: event.target.checked }))} className="size-5 accent-[#315F86]" /></label>)}</div><button type="button" disabled={busy} onClick={() => void savePreferences()} className="mt-5 flex min-h-11 items-center gap-2 rounded-xl bg-[#315F86] px-5 text-sm font-semibold text-white disabled:opacity-50"><Save size={15} />儲存通知偏好</button></section>
  </div>;
}
