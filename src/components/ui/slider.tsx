"use client";
import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { cn } from "@/lib/utils";
export const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex h-8 w-full touch-none select-none items-center",
      className,
    )}
    {...props}
  >
    <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-white/10">
      <SliderPrimitive.Range className="absolute h-full bg-cyan-400" />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb className="block size-5 cursor-grab rounded-full border-[3px] border-[#111827] bg-cyan-300 shadow-[0_0_0_2px_#22d3ee,0_0_18px_#06b6d480] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-300" />
  </SliderPrimitive.Root>
));
Slider.displayName = "滑桿";
