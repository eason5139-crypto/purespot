import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
export const buttonVariants = cva(
  "inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#090D16] [&_svg]:size-4 shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-cyan-400 text-slate-950 hover:bg-cyan-300 shadow-[0_4px_25px_-8px_#06b6d4]",
        secondary:
          "border border-white/10 bg-white/5 text-slate-100 hover:border-cyan-500/40 hover:bg-white/10",
        ghost: "text-slate-400 hover:bg-white/5 hover:text-white",
        danger: "bg-rose-400/10 text-rose-300 hover:bg-rose-400/20",
      },
      size: {
        default: "h-11 px-5",
        sm: "h-9 px-3",
        icon: "size-11",
        lg: "h-12 px-6",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);
export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild, type = "button", ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        type={asChild ? undefined : type}
        {...props}
      />
    );
  },
);
Button.displayName = "按鈕";
