"use client";
import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LogIn, UserPlus, Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/useAuthStore";
import { useUiStore } from "@/store/useUiStore";

export function AuthModal() {
  const close = useUiStore((s) => s.setAuthOpen);
  const login = useAuthStore((s) => s.login);
  const register = useAuthStore((s) => s.register);
  const [mode, setMode] = useState<"login" | "register" | "confirm" | "recover">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [demoCode, setDemoCode] = useState("");
  const [enteredCode, setEnteredCode] = useState("");
  const [recoveryRequested, setRecoveryRequested] = useState(false);
  const [recoveryMessage, setRecoveryMessage] = useState("");
  const lock = useRef(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (mode === "confirm" || mode === "recover") return;
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      if (mode === "login") {
        await login(email, password);
        toast.success("歡迎回來！");
      } else {
        await register(email, password, name);
        const response = await fetch("/api/account/confirm", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "begin" }) });
        const data = await response.json() as { code?: string };
        if (response.ok && data.code) { setDemoCode(data.code); setMode("confirm"); toast.success("帳戶已建立，請完成站內確認"); return; }
        toast.success("帳戶已建立，歡迎加入 PURESPOT！");
      }
      close(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "操作失敗，請再試一次");
    } finally {
      setBusy(false);
      lock.current = false;
    }
  }

  async function confirmAccount(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError("");
    try {
      const response = await fetch("/api/account/confirm", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "confirm", code: enteredCode }) });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "確認失敗");
      toast.success("帳戶確認完成"); close(false);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "確認失敗"); }
    finally { setBusy(false); }
  }

  async function recoverAccount(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError("");
    try {
      const response = await fetch("/api/auth/recovery", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(recoveryRequested ? { action: "reset", email, code: enteredCode, newPassword: password } : { action: "request", email }) });
      const data = await response.json() as { error?: string; message?: string };
      if (!response.ok) throw new Error(data.error || "無法處理，請稍後重試");
      setRecoveryMessage(data.message || "申請已送出");
      if (recoveryRequested) { setMode("login"); setPassword(""); setRecoveryRequested(false); toast.success("密碼已更新"); }
      else setRecoveryRequested(true);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "操作失敗"); }
    finally { setBusy(false); }
  }

  return (
    <Dialog open onOpenChange={close}>
      <DialogContent className="max-w-md">
        <div className="mb-6 flex gap-1 rounded-xl border border-[#e8ded3] bg-[#f5ede3] p-1">
          {(["login", "register"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMode(m);
                setError("");
              }}
              className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-all ${
                  mode === m
                  ? "bg-[#5B93C5] text-white shadow-sm"
                  : "text-[#675e53] hover:text-[#302b26]"
              }`}
            >
              {m === "login" ? "會員登入" : "建立帳戶"}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={mode}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
          >
            <DialogTitle className="sr-only">
              {mode === "login" ? "會員登入" : mode === "register" ? "建立帳戶" : mode === "confirm" ? "帳戶確認" : "重設密碼"}
            </DialogTitle>
            <DialogDescription className="mb-5 text-sm text-[#8a7f75]">
              {mode === "login" ? "登入後查看訂單、毛孩檔案與家庭清單。" : mode === "register" ? "建立帳戶，保存你與毛孩的日常。" : mode === "confirm" ? "輸入本站提供的一次性確認碼。" : "先申請重設，再輸入管理員提供的確認碼。"}
            </DialogDescription>
            {mode === "confirm" ? <form onSubmit={(e) => void confirmAccount(e)} className="space-y-4"><p className="rounded-xl border border-[#b7d3e7] bg-[#f1f7fa] p-3 text-sm text-[#315F86]">站內確認碼：<strong className="ml-2 font-mono text-lg tracking-widest">{demoCode}</strong><span className="mt-1 block text-xs">目前顯示於本裝置，尚未寄送電子郵件。</span></p><label className="field-label">確認碼<input className="input" inputMode="numeric" maxLength={8} value={enteredCode} onChange={(e) => setEnteredCode(e.target.value)} required /></label>{error && <p role="alert" className="text-sm text-rose-600">{error}</p>}<Button type="submit" className="w-full" disabled={busy || enteredCode.length !== 8}>完成確認</Button><button type="button" className="w-full text-xs text-[#5B93C5]" onClick={() => close(false)}>稍後再確認</button></form> : mode === "recover" ? <form onSubmit={(e) => void recoverAccount(e)} className="space-y-4"><label className="field-label">電子信箱<input className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>{recoveryRequested && <><label className="field-label">一次性確認碼<input className="input" inputMode="numeric" maxLength={8} value={enteredCode} onChange={(e) => setEnteredCode(e.target.value)} required /></label><label className="field-label">新密碼<input className="input" type="password" autoComplete="new-password" minLength={12} value={password} onChange={(e) => setPassword(e.target.value)} required /></label></>}{recoveryMessage && <p className="rounded-xl bg-[#f1f7fa] p-3 text-xs text-[#315F86]">{recoveryMessage}</p>}{error && <p role="alert" className="text-sm text-rose-600">{error}</p>}<Button type="submit" className="w-full" disabled={busy}>{recoveryRequested ? "設定新密碼" : "申請重設"}</Button><button type="button" className="w-full text-xs text-[#5B93C5]" onClick={() => setMode("login")}>返回登入</button></form> : <form onSubmit={(e) => void submit(e)} className="space-y-4">
              {mode === "register" && (
                <label className="field-label">
                  暱稱
                  <input
                    className="input"
                    value={name}
                    maxLength={50}
                    placeholder="怎麼稱呼你？"
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </label>
              )}

              <label className="field-label">
                電子信箱
                <input
                  className="input"
                  type="email"
                  value={email}
                  autoComplete="email"
                  placeholder="your@email.com"
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </label>
              {mode === "login" && <button type="button" className="block text-right text-xs font-semibold text-[#5B93C5] hover:underline" onClick={() => { setMode("recover"); setError(""); }}>忘記密碼？</button>}

              <label className="field-label">
                密碼
                <div className="relative">
                  <input
                    className="input pr-12"
                    type={showPw ? "text" : "password"}
                    value={password}
                    autoComplete={
                      mode === "login" ? "current-password" : "new-password"
                    }
                    placeholder={
                      mode === "register"
                        ? "至少 12 個字元"
                        : "輸入你的密碼"
                    }
                    minLength={mode === "register" ? 12 : 1}
                    maxLength={128}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="absolute right-3 top-1/2 mt-1 -translate-y-1/2 text-[#8a7f75] hover:text-[#302b26]"
                    aria-label={showPw ? "隱藏密碼" : "顯示密碼"}
                  >
                    {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
                {mode === "register" && (
                  <p className="mt-1.5 text-xs text-[#8a7f75]">
                    至少 12 個字元，建議使用大小寫字母與數字混合。
                  </p>
                )}
              </label>

              {error && (
                <p role="alert" className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg p-2">
                  {error}
                </p>
              )}

              <Button className="w-full" size="lg" type="submit" disabled={busy}>
                {busy ? (
                  <Loader2 className="animate-spin" />
                ) : mode === "login" ? (
                  <LogIn />
                ) : (
                  <UserPlus />
                )}
                {busy
                  ? "處理中…"
                  : mode === "login"
                    ? "登入"
                    : "建立帳戶"}
              </Button>

              <p className="text-center text-xs text-[#8a7f75]">
                {mode === "login" ? (
                  <>
                    還沒有帳戶？
                    <button
                      type="button"
                      className="ml-1 text-[#5B93C5] font-semibold hover:underline"
                      onClick={() => {
                        setMode("register");
                        setError("");
                      }}
                    >
                      立即建立
                    </button>
                  </>
                ) : (
                  <>
                    已有帳戶？
                    <button
                      type="button"
                      className="ml-1 text-[#5B93C5] font-semibold hover:underline"
                      onClick={() => {
                        setMode("login");
                        setError("");
                      }}
                    >
                      直接登入
                    </button>
                  </>
                )}
              </p>
            </form>}
          </motion.div>
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
