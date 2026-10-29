import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#935941] focus-visible:ring-offset-2 focus-visible:ring-offset-[#f8f5ef] [&_svg]:size-4 shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-[#935941] text-white hover:bg-[#794632] shadow-sm",
        secondary:
          "border border-[#d9cfc3] bg-[#fbf8f3] text-[#4e443a] hover:bg-[#ede5da]",
        ghost: "text-[#5e544a] hover:bg-[#f3ede3] hover:text-[#302b26]",
        danger: "border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100",
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
