"use client";
import { useEffect, useState } from "react";
import { MotionConfig } from "framer-motion";
import { Toaster } from "sonner";
import { usePetContextStore } from "@/store/usePetContextStore";
import { useCartStore } from "@/store/useCartStore";
import { useAutoshipStore } from "@/store/useAutoshipStore";
import { useAuthStore } from "@/store/useAuthStore";
export function Providers({ children }: { children: React.ReactNode }) {
  const [storageError, setStorageError] = useState(false);
  useEffect(() => {
    let mounted = true;
    async function hydrate() {
      try {
        await Promise.all([
          usePetContextStore.persist.rehydrate(),
          useCartStore.persist.rehydrate(),
          useAutoshipStore.persist.rehydrate(),
        ]);
        localStorage.setItem("purespot-storage-check", "1");
        localStorage.removeItem("purespot-storage-check");
        // 嘗試讀取已登入的會員 session（不阻斷展示模式）
        void useAuthStore.getState().fetchUser();
      } catch {
        if (mounted) setStorageError(true);
      }
    }
    void hydrate();
    return () => {
      mounted = false;
    };
  }, []);
  return (
    <MotionConfig
      reducedMotion="user"
      transition={{ type: "spring", stiffness: 300, damping: 28 }}
    >
      {storageError && (
        <p
          role="status"
          className="bg-amber-400/10 p-3 text-center text-sm text-amber-200"
        >
          瀏覽器儲存空間無法使用，本次資料可能不會保留。
        </p>
      )}
      {children}
      <Toaster
        theme="dark"
        position="bottom-right"
        richColors
        closeButton
        toastOptions={{
          style: {
            fontFamily: "inherit",
            background: "#152033",
            border: "1px solid #ffffff20",
            color: "#f8fafc",
          },
        }}
      />
    </MotionConfig>
  );
}

