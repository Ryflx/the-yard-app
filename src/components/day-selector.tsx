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
    <section className="flex gap-2 overflow-x-auto whitespace-nowrap">
      {days.map((day) => (
        <button
          key={day.date}
          onClick={() => selectDay(day.date)}
          className={cn(
            "squishy px-6 py-3 font-headline text-xs font-bold uppercase tracking-widest transition-colors",
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
