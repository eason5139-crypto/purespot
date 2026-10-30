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
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
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
              {mode === "login" ? "會員登入" : "建立帳戶"}
            </DialogTitle>
            <DialogDescription className="mb-5 text-sm text-[#8a7f75]">
              {mode === "login"
                ? "登入後，毛孩資料與訂單紀錄都安全保存在雲端。"
                : "建立帳戶，讓每一份為毛孩的選擇都被記住。"}
            </DialogDescription>

            <form onSubmit={(e) => void submit(e)} className="space-y-4">
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
            </form>
          </motion.div>
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
