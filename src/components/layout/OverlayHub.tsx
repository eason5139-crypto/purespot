"use client";
import dynamic from "next/dynamic";
import { useUiStore } from "@/store/useUiStore";
const Calculator = dynamic(
  () =>
    import("@/components/calculator/NutritionCalculatorModal").then(
      (m) => m.NutritionCalculatorModal,
    ),
  { ssr: false },
);
const Feed = dynamic(
  () =>
    import("@/components/community/UgcFeedModal").then((m) => m.UgcFeedModal),
  { ssr: false },
);
const Cart = dynamic(
  () => import("@/components/shop/CartDrawer").then((m) => m.CartDrawer),
  { ssr: false },
);
const PetEditor = dynamic(
  () => import("@/components/pets/PetEditor").then((m) => m.PetEditor),
  { ssr: false },
);
const Auth = dynamic(
  () => import("@/components/auth/AuthModal").then((m) => m.AuthModal),
  { ssr: false },
);
export function OverlayHub() {
  const calculator = useUiStore((s) => s.calculatorProductId);
  const ugc = useUiStore((s) => s.ugcPostId);
  const cart = useUiStore((s) => s.cartOpen);
  const editor = useUiStore((s) => s.petEditorOpen);
  const auth = useUiStore((s) => s.authOpen);
  return (
    <>
      {calculator && <Calculator />}
      {ugc && <Feed />}
      {cart && <Cart />}
      {editor && <PetEditor />}
      {auth && <Auth />}
    </>
  );
}
