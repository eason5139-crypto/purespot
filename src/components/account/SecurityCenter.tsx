"use client";

import { useEffect, useState } from "react";
import { KeyRound, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { accountJson, jsonRequest } from "@/lib/accountTypes";

export function SecurityCenter() {
  const [confirmed, setConfirmed] = useState(false);
  const [code, setCode] = useState("");
  const [entered, setEntered] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { void accountJson<{ demoConfirmedAt: string | null }>("/api/account/confirm").then((data) => setConfirmed(Boolean(data.demoConfirmedAt))).catch(() => {}); }, []);
  async function begin() { setBusy(true); try { const data = await accountJson<{ code: string }>("/api/account/confirm", jsonRequest("POST", { action: "begin" })); setCode(data.code); toast.success("確認碼已準備好"); } catch (reason) { setError(reason instanceof Error ? reason.message : "無法取得確認碼"); } finally { setBusy(false); } }
  async function confirm() { setBusy(true); try { await accountJson("/api/account/confirm", jsonRequest("POST", { action: "confirm", code: entered })); setConfirmed(true); setCode(""); toast.success("帳戶確認完成"); } catch (reason) { setError(reason instanceof Error ? reason.message : "確認失敗"); } finally { setBusy(false); } }
  async function changePassword() { setBusy(true); setError(""); try { await accountJson("/api/account/confirm", jsonRequest("POST", { action: "password", currentPassword, newPassword })); setCurrentPassword(""); setNewPassword(""); toast.success("密碼已更新"); } catch (reason) { setError(reason instanceof Error ? reason.message : "密碼更新失敗"); } finally { setBusy(false); } }
  return <section className="space-y-6"><header><h2 className="editorial-title text-3xl text-[#263746]">帳戶安全</h2><p className="mt-2 text-sm text-[#687985]">確認帳戶、更新密碼，照顧自己的資料。</p></header>{error && <p role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{error}</p>}<div className="grid gap-5 xl:grid-cols-2"><div className="rounded-[24px] border border-[#e1d7cc] bg-white p-6"><ShieldCheck size={26} className="text-[#5B93C5]" /><h3 className="mt-4 font-semibold text-[#263746]">站內帳戶確認</h3><p className="mt-2 text-sm text-[#687985]">{confirmed ? "已完成站內確認。" : "取得一次性確認碼後輸入，完成站內確認。"}</p><p className="mt-2 text-xs leading-5 text-[#8b918f]">目前確認碼顯示於登入的裝置；正式郵件寄送啟用後，才能驗證信箱所有權。</p>{!confirmed && <><button type="button" disabled={busy} onClick={() => void begin()} className="mt-4 min-h-10 rounded-xl bg-[#315F86] px-4 text-xs font-semibold text-white">取得確認碼</button>{code && <div className="mt-4 rounded-xl bg-[#f1f7fa] p-4"><p className="text-xs text-[#687985]">本次確認碼</p><strong className="font-mono text-xl tracking-widest text-[#315F86]">{code}</strong><div className="mt-3 flex gap-2"><input className="input" inputMode="numeric" maxLength={8} value={entered} onChange={(e) => setEntered(e.target.value)} aria-label="輸入確認碼" /><button type="button" disabled={busy || entered.length !== 8} onClick={() => void confirm()} className="rounded-xl bg-[#315F86] px-4 text-xs font-semibold text-white disabled:opacity-40">確認</button></div></div>}</>}</div><div className="rounded-[24px] border border-[#e1d7cc] bg-white p-6"><KeyRound size={26} className="text-[#5B93C5]" /><h3 className="mt-4 font-semibold text-[#263746]">更改密碼</h3><label className="mt-4 block text-xs text-[#687985]">目前密碼<input className="input mt-1" type="password" autoComplete="current-password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} /></label><label className="mt-3 block text-xs text-[#687985]">新密碼（至少 12 字元）<input className="input mt-1" type="password" autoComplete="new-password" minLength={12} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} /></label><button type="button" disabled={busy || !currentPassword || newPassword.length < 12} onClick={() => void changePassword()} className="mt-4 min-h-10 rounded-xl bg-[#315F86] px-4 text-xs font-semibold text-white disabled:opacity-40">儲存新密碼</button></div></div></section>;
}
