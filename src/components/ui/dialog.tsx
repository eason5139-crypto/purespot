"use client";
import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;
export const DialogTitle = DialogPrimitive.Title;
export const DialogDescription = DialogPrimitive.Description;

export interface DialogContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  side?: "center" | "right";
}

export const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  DialogContentProps
>(({ className, children, side = "center", ...props }, ref) => {
  const previousFocus = React.useRef<HTMLElement | null>(null);
  React.useLayoutEffect(() => {
    previousFocus.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
  }, []);

  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="dialog-overlay fixed inset-0 z-50 bg-black/45 backdrop-blur-sm" />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          "dialog-content fixed z-50 overflow-y-auto border border-[#e8ded3] bg-[#faf7f2] text-[#302b26] shadow-2xl focus:outline-none",
          side === "right"
            ? "drawer-content inset-y-0 right-0 w-full max-w-lg p-6 sm:p-8"
            : "left-1/2 top-1/2 max-h-[90dvh] w-[calc(100%-2rem)] max-w-3xl -translate-x-1/2 -translate-y-1/2 rounded-3xl p-5 sm:p-8",
          className,
        )}
        {...props}
        onCloseAutoFocus={(event) => {
          props.onCloseAutoFocus?.(event);
          if (
            !event.defaultPrevented &&
            previousFocus.current?.isConnected &&
            !document.querySelector('[role="dialog"][data-state="open"]')
          ) {
            event.preventDefault();
            previousFocus.current.focus();
          }
        }}
      >
        {children}
        <DialogPrimitive.Close className="absolute right-4 top-4 z-10 flex size-10 cursor-pointer items-center justify-center rounded-full border border-[#d9cfc3] bg-white text-[#5e544a] hover:bg-[#f3ede3] hover:text-[#302b26] focus-visible:ring-2 focus-visible:ring-[#5B93C5]">
          <X size={18} />
          <span className="sr-only">關閉視窗</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
});

DialogContent.displayName = "對話視窗";
