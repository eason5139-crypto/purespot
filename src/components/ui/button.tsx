import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-150 disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#935941] focus-visible:ring-offset-2 focus-visible:ring-offset-[#f8f5ef] [&_svg]:size-4 shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-[#935941] text-white shadow-[0_3px_0_#6e3f2c] hover:-translate-y-0.5 hover:bg-[#7d4934] hover:shadow-[0_4px_0_#5e3423] active:translate-y-0.5 active:shadow-[0_1px_0_#6e3f2c]",
        secondary:
          "border border-[#d8c7b4] bg-[#fffbf4] text-[#4a3f35] shadow-[0_2px_0_#d8c7b4] hover:-translate-y-0.5 hover:border-[#b89f86] hover:bg-[#f4ece1] active:translate-y-0.5 active:shadow-none",
        ghost:
          "text-[#5e544a] hover:bg-[#f3eae0] hover:text-[#935941] active:scale-95",
        danger:
          "border border-rose-200 bg-rose-50 text-rose-700 shadow-[0_2px_0_#fecdd3] hover:bg-rose-100 active:translate-y-0.5",
      },
      size: {
        default: "h-11 px-5",
        sm: "h-9 px-3.5",
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
