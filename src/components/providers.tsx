"use client";
import { useEffect, useState } from "react";
import { MotionConfig } from "framer-motion";
import { Toaster } from "sonner";
import { usePetContextStore } from "@/store/usePetContextStore";
import { useCartStore } from "@/store/useCartStore";
import { useAutoshipStore } from "@/store/useAutoshipStore";
import { useAuthStore } from "@/store/useAuthStore";
import { useCatalogStore } from "@/store/useCatalogStore";
import { useFavoritesStore } from "@/store/useFavoritesStore";
export function Providers({ children }: { children: React.ReactNode }) {
  const [storageError, setStorageError] = useState(false);
  useEffect(() => {
    let mounted = true;
    async function hydrate() {
      try {
        const catalogResponse = await fetch("/api/products", { cache: "no-store" });
        if (catalogResponse.ok) {
          const data = (await catalogResponse.json()) as { products?: import("@/lib/types").Product[] };
          if (data.products) useCatalogStore.getState().setProducts(data.products);
        }
        await Promise.all([
          usePetContextStore.persist.rehydrate(),
          useCartStore.persist.rehydrate(),
          useAutoshipStore.persist.rehydrate(),
          useFavoritesStore.persist.rehydrate(),
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
          className="border-b border-[#ebd7be] bg-[#fbf3e6] p-3 text-center text-sm text-[#8c5d33]"
        >
          瀏覽器儲存空間無法使用，本次資料可能不會保留。
        </p>
      )}
      {children}
      <Toaster
        theme="light"
        position="bottom-right"
        richColors
        closeButton
        toastOptions={{
          style: {
            fontFamily: "inherit",
            background: "#ffffff",
            border: "1px solid #e8ded3",
            color: "#302b26",
            boxShadow: "0 10px 30px -10px rgba(147, 89, 65, 0.15)",
          },
        }}
      />
    </MotionConfig>
  );
}

