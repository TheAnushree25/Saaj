import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Text } from "./text";

/** The small spaced-out capitals that sit above every section title. */
export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <Text className={cn("font-bold text-[10px] leading-[15px] tracking-[2px] text-primary", className)}>{children}</Text>;
}
