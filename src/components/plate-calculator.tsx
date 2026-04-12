"use client";

import { useState } from "react";

const PLATES = [25, 20, 15, 10, 5, 2.5, 1.25, 0.5];
const BAR_OPTIONS = [20, 15];

function calculatePlates(
  targetWeight: number,
  barWeight: number
): number[] | null {
  let remaining = targetWeight - barWeight;
  if (remaining < 0) return null;

  remaining = remaining / 2;
  const plates: number[] = [];

  for (const plate of PLATES) {
    while (remaining >= plate - 0.001) {
      plates.push(plate);
      remaining -= plate;
    }
  }

  if (remaining > 0.01) return null;
  return plates;
}

interface PlateCalculatorProps {
  weight: number;
  unit?: string;
}

export function PlateToggle({
  open,
  onToggle,
}: {
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className={`flex shrink-0 items-center justify-center p-1 transition-colors ${
        open ? "text-primary" : "text-outline hover:text-on-surface"
      }`}
      title="Plate calculator"
    >
      <span className="material-symbols-outlined text-sm">calculate</span>
    </button>
  );
}

export function PlatePanel({
  weight,
  unit = "kg",
}: PlateCalculatorProps) {
  const [barWeight, setBarWeight] = useState(20);

  const plates = calculatePlates(weight, barWeight);

  const plateCounts: Record<number, number> = {};
  if (plates) {
    for (const p of plates) {
      plateCounts[p] = (plateCounts[p] || 0) + 1;
    }
  }

  return (
    <div className="border-t border-outline-variant/30 px-3 pb-3 pt-2">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
          BAR
        </span>
        {BAR_OPTIONS.map((bw) => (
          <button
            key={bw}
            onClick={() => setBarWeight(bw)}
            className={`px-2 py-0.5 text-[10px] font-bold transition-colors ${
              barWeight === bw
                ? "bg-primary-container text-on-primary-fixed"
                : "bg-surface-variant text-on-surface-variant hover:bg-surface-bright"
            }`}
          >
            {bw}{unit}
          </button>
        ))}
      </div>

      {plates ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
            EACH SIDE
          </span>
          {Object.entries(plateCounts)
            .sort(([a], [b]) => Number(b) - Number(a))
            .map(([plate, count]) => (
              <span
                key={plate}
                className="flex items-center gap-1 bg-surface-container-highest px-2 py-0.5"
              >
                <span className="font-headline text-xs font-bold text-on-surface">
                  {Number(plate) % 1 === 0 ? Number(plate) : plate}
                </span>
                <span className="text-[9px] text-on-surface-variant">{unit}</span>
                {count > 1 && (
                  <span className="text-[9px] font-bold text-primary">
                    ×{count}
                  </span>
                )}
              </span>
            ))}
          {weight <= barWeight && (
            <span className="text-[10px] font-bold uppercase tracking-widest text-primary">
              EMPTY BAR
            </span>
          )}
        </div>
      ) : (
        <p className="text-[10px] font-bold uppercase tracking-widest text-outline">
          CAN&apos;T MAKE {weight}{unit} WITH STANDARD PLATES
        </p>
      )}
    </div>
  );
}
