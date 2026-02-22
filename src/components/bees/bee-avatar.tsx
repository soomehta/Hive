"use client";

import { Bot, Shield, Users, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BeeType } from "@/types/bees";

const BEE_CONFIG: Record<
  BeeType,
  { icon: React.ElementType; color: string; bg: string }
> = {
  assistant: { icon: Bot, color: "text-violet-400", bg: "bg-violet-500/10" },
  admin: { icon: Shield, color: "text-amber-400", bg: "bg-amber-500/10" },
  manager: { icon: Users, color: "text-blue-400", bg: "bg-blue-500/10" },
  operator: { icon: Wrench, color: "text-emerald-400", bg: "bg-emerald-500/10" },
};

interface BeeAvatarProps {
  type: BeeType;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function BeeAvatar({ type, size = "md", className }: BeeAvatarProps) {
  const config = BEE_CONFIG[type] ?? BEE_CONFIG.operator;
  const Icon = config.icon;

  const sizeClasses = {
    sm: "size-6",
    md: "size-8",
    lg: "size-10",
  };

  const iconSizeClasses = {
    sm: "size-3",
    md: "size-4",
    lg: "size-5",
  };

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full shrink-0",
        config.bg,
        sizeClasses[size],
        className
      )}
    >
      <Icon className={cn(iconSizeClasses[size], config.color)} />
    </div>
  );
}
