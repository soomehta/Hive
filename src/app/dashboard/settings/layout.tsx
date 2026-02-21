"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Building2, User, Bot } from "lucide-react";

const SETTINGS_NAV = [
  { label: "Organization", href: "/dashboard/settings", icon: Building2 },
  { label: "Profile", href: "/dashboard/settings/profile", icon: User },
  { label: "PA Assistant", href: "/dashboard/settings/pa", icon: Bot },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex gap-6">
      <nav className="w-48 shrink-0 space-y-1">
        <h2 className="text-sm font-semibold text-muted-foreground mb-3 px-3">Settings</h2>
        {SETTINGS_NAV.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard/settings" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-accent text-accent-foreground font-medium"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
