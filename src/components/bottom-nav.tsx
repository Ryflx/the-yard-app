"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface BottomNavProps {
  isAdmin: boolean;
}

const memberItems = [
  { href: "/schedule", label: "SCHEDULE", icon: "calendar_month" },
  { href: "/progress", label: "PROGRESS", icon: "trending_up" },
  { href: "/profile", label: "PROFILE", icon: "account_circle" },
];

const adminItems = [
  { href: "/schedule", label: "SCHEDULE", icon: "calendar_month" },
  { href: "/admin", label: "COACH", icon: "edit_note" },
  { href: "/progress", label: "PROGRESS", icon: "trending_up" },
  { href: "/profile", label: "PROFILE", icon: "account_circle" },
];

export function BottomNav({ isAdmin }: BottomNavProps) {
  const pathname = usePathname();
  const navItems = isAdmin ? adminItems : memberItems;

  return (
    <nav className="fixed bottom-0 left-0 z-50 flex h-20 w-full items-center justify-around bg-[#0e0e0e]/90 pb-4 shadow-[0_-10px_30px_rgba(0,0,0,0.5)] backdrop-blur-md">
      {navItems.map((item) => {
        let isActive = false;
        if (item.label === "SCHEDULE") {
          isActive =
            pathname === "/schedule" || pathname.startsWith("/workout/");
        } else if (item.label === "COACH") {
          isActive = pathname.startsWith("/admin");
        } else if (item.label === "PROGRESS") {
          isActive = pathname === "/progress";
        } else if (item.label === "PROFILE") {
          isActive = pathname === "/profile";
        }

        return (
          <Link
            key={item.label}
            href={item.href}
            data-tour={`nav-${item.label.toLowerCase()}`}
            className={cn(
              "flex flex-col items-center justify-center p-2 transition-all duration-200 active:bg-primary-container active:text-[#0e0e0e]",
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
