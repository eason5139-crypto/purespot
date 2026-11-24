"use client";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import * as Dialog from "@radix-ui/react-dialog";
import { Headset, X } from "lucide-react";
const Panel = dynamic(
  () => import("./SupportPanel").then((m) => m.SupportPanel),
  { ssr: false, loading: () => <p className="p-8 text-sm">正在打開客服…</p> },
);
export function LiveSupportWidget() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener("purespot:open-support", show);
    return () => window.removeEventListener("purespot:open-support", show);
  }, []);
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <div className="live-support-launcher fixed bottom-5 right-5 z-40">
        <Dialog.Trigger asChild>
          <button
            type="button"
            aria-label="開啟職人線上客服中心"
            className="flex items-center gap-2 rounded-full border border-[#b8cedd] bg-[#fffefa] p-3 text-[#315f86] shadow-lg"
          >
            <Headset size={22} />
            <span className="hidden text-xs font-semibold sm:block">
              線上客服
            </span>
          </button>
        </Dialog.Trigger>
      </div>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-[#102d40]/30 backdrop-blur-sm" />
        <Dialog.Content className="support-dialog">
          <Dialog.Title className="sr-only">PURESPOT 線上客服</Dialog.Title>
          <Dialog.Description className="sr-only">
            提出新諮詢、查看處理進度與詢問歷史。
          </Dialog.Description>
          <Dialog.Close asChild>
            <button className="support-dialog-close" aria-label="關閉客服視窗">
              <X size={20} />
            </button>
          </Dialog.Close>
          <Panel />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
