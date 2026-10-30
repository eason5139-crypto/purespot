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
    <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-[#e6dcce]">
      <SliderPrimitive.Range className="absolute h-full bg-[#5B93C5]" />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb className="block size-5 cursor-grab rounded-full border-[3px] border-white bg-[#5B93C5] shadow-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#5B93C5]" />
  </SliderPrimitive.Root>
));
Slider.displayName = "滑桿";
