"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { format, addDays, subDays, startOfWeek, isSameWeek } from "date-fns";

export function WeekNav() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const weekParam = searchParams.get("week");
  const classParam = searchParams.get("class");

  const currentWeekStart = weekParam
    ? new Date(weekParam + "T00:00:00")
    : startOfWeek(new Date(), { weekStartsOn: 1 });

  const weekEnd = addDays(currentWeekStart, 5);
  const isCurrentWeek = isSameWeek(currentWeekStart, new Date(), { weekStartsOn: 1 });

  function navigateToWeek(weekStart: Date) {
    const isThisWeek = isSameWeek(weekStart, new Date(), { weekStartsOn: 1 });
    const params = new URLSearchParams();
    if (!isThisWeek) {
      params.set("week", format(weekStart, "yyyy-MM-dd"));
    }
    if (classParam) {
      params.set("class", classParam);
    }
    const qs = params.toString();
    router.push(qs ? `/schedule?${qs}` : "/schedule");
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => navigateToWeek(subDays(currentWeekStart, 7))}
        className="squishy p-1 text-on-surface-variant hover:text-white"
      >
        <span className="material-symbols-outlined text-lg">chevron_left</span>
      </button>
      <button
        onClick={() => {
          if (!isCurrentWeek) navigateToWeek(startOfWeek(new Date(), { weekStartsOn: 1 }));
        }}
        className={`font-label text-[10px] font-bold uppercase tracking-[0.15em] ${
          isCurrentWeek
            ? "text-primary"
            : "text-on-surface-variant underline decoration-dotted underline-offset-4 hover:text-white"
        }`}
      >
        {isCurrentWeek
          ? "THIS WEEK"
          : `${format(currentWeekStart, "d MMM")} \u2013 ${format(weekEnd, "d MMM")}`}
      </button>
      <button
        onClick={() => navigateToWeek(addDays(currentWeekStart, 7))}
        className="squishy p-1 text-on-surface-variant hover:text-white"
      >
        <span className="material-symbols-outlined text-lg">chevron_right</span>
      </button>
    </div>
  );
}
