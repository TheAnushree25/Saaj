import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Text } from "./text";

/** The small spaced-out capitals that sit above every section title. */
export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <Text className={cn("font-bold text-[0.625rem] leading-[0.9375rem] tracking-[0.125rem] text-primary", className)}>{children}</Text>;
}
