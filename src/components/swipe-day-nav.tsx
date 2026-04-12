"use client";

import { useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";

interface SwipeDayNavProps {
  days: string[];
  selectedDay: string;
  children: React.ReactNode;
}

const SWIPE_THRESHOLD = 50;

export function SwipeDayNav({ days, selectedDay, children }: SwipeDayNavProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const navigate = useCallback(
    (direction: "left" | "right") => {
      const idx = days.indexOf(selectedDay);
      if (idx === -1) return;

      const nextIdx = direction === "left" ? idx + 1 : idx - 1;
      if (nextIdx < 0 || nextIdx >= days.length) return;

      const params = new URLSearchParams(searchParams.toString());
      params.set("day", days[nextIdx]);
      router.push(`/schedule?${params.toString()}`);
    },
    [days, selectedDay, searchParams, router]
  );

  function handleTouchStart(e: React.TouchEvent) {
    const touch = e.touches[0];
    touchStart.current = { x: touch.clientX, y: touch.clientY };
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (!touchStart.current) return;

    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStart.current.x;
    const dy = touch.clientY - touchStart.current.y;
    touchStart.current = null;

    if (Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dy) > Math.abs(dx)) return;

    navigate(dx < 0 ? "left" : "right");
  }

  return (
    <div onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      {children}
    </div>
  );
}
