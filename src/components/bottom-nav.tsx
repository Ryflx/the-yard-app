"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/schedule", label: "SCHEDULE", icon: "calendar_today" },
  { href: "/progress", label: "PROFILE", icon: "account_circle" },
  { href: "/admin/workouts", label: "ADMIN", icon: "settings" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 z-50 flex h-20 w-full items-center justify-around bg-[#0e0e0e]/90 pb-4 shadow-[0_-10px_30px_rgba(0,0,0,0.5)] backdrop-blur-md">
      {navItems.map((item) => {
        const isActive =
          pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex w-1/3 flex-col items-center justify-center p-2 transition-all duration-200",
              isActive
                ? "bg-surface-container-high text-primary-container"
                : "text-on-surface-variant hover:text-white"
            )}
          >
            <span
              className="material-symbols-outlined text-2xl"
              style={
                isActive
                  ? { fontVariationSettings: "'FILL' 1" }
                  : undefined
              }
            >
              {item.icon}
            </span>
            <span className="mt-1 font-label text-[10px] font-bold tracking-widest">
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
