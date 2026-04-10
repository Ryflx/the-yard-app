"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { format, addDays, subDays, startOfWeek } from "date-fns";

export function WeekNav() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const weekParam = searchParams.get("week");

  const currentWeekStart = weekParam
    ? new Date(weekParam + "T00:00:00")
    : startOfWeek(new Date(), { weekStartsOn: 1 });

  const weekEnd = addDays(currentWeekStart, 4);

  function navigate(direction: "prev" | "next") {
    const newStart =
      direction === "prev"
        ? subDays(currentWeekStart, 7)
        : addDays(currentWeekStart, 7);
    router.push(`/schedule?week=${format(newStart, "yyyy-MM-dd")}`);
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() => navigate("prev")}
        className="squishy text-on-surface-variant hover:text-white"
      >
        <span className="material-symbols-outlined text-lg">chevron_left</span>
      </button>
      <span className="font-label text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">
        {format(currentWeekStart, "d MMM")} &ndash;{" "}
        {format(weekEnd, "d MMM")}
      </span>
      <button
        onClick={() => navigate("next")}
        className="squishy text-on-surface-variant hover:text-white"
      >
        <span className="material-symbols-outlined text-lg">chevron_right</span>
      </button>
    </div>
  );
}
