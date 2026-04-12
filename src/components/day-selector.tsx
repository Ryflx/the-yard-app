"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

interface DaySelectorProps {
  days: { date: string; label: string; isToday: boolean }[];
  selectedDay: string;
}

export function DaySelector({ days, selectedDay }: DaySelectorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function selectDay(date: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("day", date);
    router.push(`/schedule?${params.toString()}`);
  }

  return (
    <section className="flex gap-1">
      {days.map((day) => (
        <button
          key={day.date}
          onClick={() => selectDay(day.date)}
          className={cn(
            "squishy min-w-0 flex-1 py-3 text-center font-headline text-[10px] font-bold uppercase tracking-wider transition-colors sm:text-xs sm:tracking-widest",
            day.date === selectedDay
              ? "bg-primary-container text-on-primary-fixed"
              : "bg-surface-container-high text-on-surface-variant hover:bg-surface-variant"
          )}
        >
          {day.label}
        </button>
      ))}
    </section>
  );
}
