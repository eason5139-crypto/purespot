import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
export const buttonVariants = cva(
  "inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f4a261] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1b110d] [&_svg]:size-4 shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-[#f4a261] text-[#2b170f] hover:bg-[#ffb372] shadow-[0_8px_30px_-12px_#f4a261]",
        secondary:
          "border border-[#f4a261]/20 bg-[#f4a261]/7 text-[#f8e9dd] hover:border-[#f4a261]/45 hover:bg-[#f4a261]/12",
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
