"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { ClassType } from "@/db/schema";

const CLASS_TYPES: { value: ClassType; label: string }[] = [
  { value: "BARBELL", label: "BARBELL" },
  { value: "CROSSFIT", label: "CROSSFIT" },
];

interface ClassTypeTabsProps {
  selected: ClassType;
}

export function ClassTypeTabs({ selected }: ClassTypeTabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleSelect(classType: ClassType) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("class", classType);
    params.delete("day");
    router.push(`/schedule?${params.toString()}`);
  }

  return (
    <div className="flex gap-1" data-tour="class-tabs">
      {CLASS_TYPES.map((ct) => (
        <button
          key={ct.value}
          onClick={() => handleSelect(ct.value)}
          className={`flex-1 py-2.5 text-center font-headline text-[11px] font-black uppercase tracking-widest transition-colors ${
            selected === ct.value
              ? "bg-primary-container text-on-primary-fixed"
              : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
          }`}
        >
          {ct.label}
        </button>
      ))}
    </div>
  );
}
