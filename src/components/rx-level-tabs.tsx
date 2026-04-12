"use client";

import type { RxLevel } from "@/db/schema";

interface RxLevelTabsProps {
  value: RxLevel;
  onChange: (level: RxLevel) => void;
}

const LEVELS: { value: RxLevel; label: string }[] = [
  { value: "SCALED", label: "Scaled" },
  { value: "RX", label: "RX" },
  { value: "RX_PLUS", label: "RX+" },
];

export function RxLevelTabs({ value, onChange }: RxLevelTabsProps) {
  return (
    <div className="flex bg-surface-container p-1">
      {LEVELS.map((level) => (
        <button
          key={level.value}
          onClick={() => onChange(level.value)}
          className={`flex-1 py-1.5 text-center text-[11px] font-bold uppercase tracking-widest transition-colors ${
            value === level.value
              ? "bg-primary text-on-primary"
              : "text-on-surface-variant hover:text-on-surface"
          }`}
        >
          {level.label}
        </button>
      ))}
    </div>
  );
}
