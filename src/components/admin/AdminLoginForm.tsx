"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Eye, EyeOff, LoaderCircle, LockKeyhole, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AdminLoginForm({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/admin/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "登入失敗，請稍後再試");
        return;
      }
      router.replace(nextPath);
      router.refresh();
    } catch {
      setError("目前無法連線到登入服務，請稍後再試");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <motion.form
      onSubmit={handleSubmit}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="w-full max-w-md rounded-[2rem] border border-[#d59664]/25 bg-[#2c1d17]/90 p-7 shadow-[0_30px_90px_-35px_#120b08] backdrop-blur-xl sm:p-9"
    >
      <div className="mb-8">
        <span className="inline-flex items-center gap-2 rounded-full bg-[#f4a261]/10 px-3 py-1.5 text-xs font-medium text-[#ffc38e]">
          <LockKeyhole size={14} />
          授權管理員專區
        </span>
        <h1 className="mt-5 text-3xl font-semibold tracking-tight text-[#fff7ec]">
          歡迎回來
        </h1>
        <p className="mt-2 text-sm leading-6 text-[#cbb4a6]">
          登入後即可管理商品、訂單、會員與營運數據。
        </p>
      </div>

      <div className="space-y-5">
        <label className="block">
          <span className="text-sm font-medium text-[#f1dfd1]">管理員帳號</span>
          <span className="mt-2 flex items-center gap-3 rounded-xl border border-white/10 bg-[#1d120e]/70 px-4 focus-within:border-[#f4a261]/60">
            <Mail size={18} className="text-[#bc8a69]" />
            <input
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="min-h-12 w-full bg-transparent text-sm text-[#fff7ec] outline-none placeholder:text-[#806b60]"
              placeholder="name@purespot.tw"
            />
          </span>
        </label>

        <label className="block">
          <span className="text-sm font-medium text-[#f1dfd1]">密碼</span>
          <span className="mt-2 flex items-center gap-3 rounded-xl border border-white/10 bg-[#1d120e]/70 px-4 focus-within:border-[#f4a261]/60">
            <LockKeyhole size={18} className="text-[#bc8a69]" />
            <input
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              minLength={12}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="min-h-12 w-full bg-transparent text-sm text-[#fff7ec] outline-none placeholder:text-[#806b60]"
              placeholder="輸入管理員密碼"
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="rounded-lg p-1.5 text-[#9d8172] transition-colors hover:bg-white/5 hover:text-[#fff7ec]"
              aria-label={showPassword ? "隱藏密碼" : "顯示密碼"}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </span>
        </label>
      </div>

      {error && (
        <motion.p
          role="alert"
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 rounded-xl border border-rose-300/15 bg-rose-400/10 px-4 py-3 text-sm text-rose-200"
        >
          {error}
        </motion.p>
      )}

      <Button
        type="submit"
        disabled={submitting}
        className="mt-7 h-12 w-full bg-gradient-to-r from-[#f4a261] to-[#e76f51] text-[#2a1710] shadow-[0_16px_40px_-18px_#f4a261] hover:from-[#ffb372] hover:to-[#f07d5d]"
      >
        {submitting ? (
          <>
            <LoaderCircle className="animate-spin" />
            正在確認身分
          </>
        ) : (
          "安全登入後台"
        )}
      </Button>

      <p className="mt-5 text-center text-xs leading-5 text-[#8f7668]">
        為保護營運資料，登入狀態會在 8 小時後自動失效。
      </p>
    </motion.form>
  );
}
