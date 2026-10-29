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
      className="w-full max-w-md rounded-[2rem] border border-[#e8ded3] bg-white p-7 shadow-[0_20px_60px_-25px_rgba(147,89,65,0.15)] sm:p-9"
    >
      <div className="mb-8">
        <span className="inline-flex items-center gap-2 rounded-full bg-[#935941]/10 px-3 py-1.5 text-xs font-semibold text-[#935941]">
          <LockKeyhole size={14} />
          授權管理員專區
        </span>
        <h1 className="mt-5 text-3xl font-semibold tracking-tight text-[#302b26]">
          歡迎回來
        </h1>
        <p className="mt-2 text-sm leading-6 text-[#675e53]">
          登入後即可管理商品、訂單、會員與營運數據。
        </p>
      </div>

      <div className="space-y-5">
        <label className="block">
          <span className="text-sm font-medium text-[#4a4036]">管理員帳號</span>
          <span className="mt-2 flex items-center gap-3 rounded-xl border border-[#d9cfc3] bg-[#faf7f2] px-4 transition-colors focus-within:border-[#935941] focus-within:bg-white">
            <Mail size={18} className="text-[#935941]" />
            <input
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="min-h-12 w-full bg-transparent text-sm text-[#302b26] outline-none placeholder:text-[#9c9287]"
              placeholder="name@purespot.tw"
            />
          </span>
        </label>

        <label className="block">
          <span className="text-sm font-medium text-[#4a4036]">密碼</span>
          <span className="mt-2 flex items-center gap-3 rounded-xl border border-[#d9cfc3] bg-[#faf7f2] px-4 transition-colors focus-within:border-[#935941] focus-within:bg-white">
            <LockKeyhole size={18} className="text-[#935941]" />
            <input
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              minLength={12}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="min-h-12 w-full bg-transparent text-sm text-[#302b26] outline-none placeholder:text-[#9c9287]"
              placeholder="輸入管理員密碼"
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="rounded-lg p-1.5 text-[#7d7165] transition-colors hover:bg-[#f2ebe1] hover:text-[#302b26]"
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
          className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
        >
          {error}
        </motion.p>
      )}

      <Button
        type="submit"
        disabled={submitting}
        className="mt-7 h-12 w-full bg-[#935941] text-white shadow-[0_14px_35px_-15px_rgba(147,89,65,0.4)] hover:bg-[#794632]"
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

      <p className="mt-5 text-center text-xs leading-5 text-[#8a7f75]">
        為保護營運資料，登入狀態會在 8 小時後自動失效。
      </p>
    </motion.form>
  );
}
