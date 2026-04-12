"use client";

import { useState, useRef } from "react";
import { read, utils } from "xlsx";
import { parseWorkoutText, addWorkout } from "@/app/actions";
import type { ParsedWorkout } from "@/lib/workout-parser";
import { ParsedWorkoutEditor } from "./parsed-workout-editor";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface UploadedWorkout {
  text: string;
  date: string;
  parsed: ParsedWorkout | null;
  error: string | null;
  saved: boolean;
}

export function BulkUploadFlow() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [workouts, setWorkouts] = useState<UploadedWorkout[]>([]);
  const [parsing, setParsing] = useState(false);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [savingAll, setSavingAll] = useState(false);
  const [progress, setProgress] = useState(0);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const buffer = await file.arrayBuffer();
    const workbook = read(buffer);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data: string[][] = utils.sheet_to_json(sheet, { header: 1 });

    if (data.length === 0) { toast.error("Empty spreadsheet"); return; }

    // Detect layout: columns = workouts, rows = sections
    // First row = dates or headers
    const headerRow = data[0];
    const extracted: UploadedWorkout[] = [];

    for (let col = 0; col < headerRow.length; col++) {
      const dateStr = headerRow[col]?.toString().trim();
      if (!dateStr) continue;

      // Try to parse as date
      const parsedDate = parseSpreadsheetDate(dateStr);

      const cellTexts: string[] = [];
      for (let row = 1; row < data.length; row++) {
        const cell = data[row]?.[col]?.toString().trim();
        if (cell) cellTexts.push(cell);
      }

      if (cellTexts.length === 0) continue;

      extracted.push({
        text: cellTexts.join("\n\n"),
        date: parsedDate,
        parsed: null,
        error: null,
        saved: false,
      });
    }

    if (extracted.length === 0) { toast.error("No workouts found in file"); return; }

    setWorkouts(extracted);
    toast.success(`Found ${extracted.length} workouts`);

    // Parse all sequentially
    setParsing(true);
    for (let i = 0; i < extracted.length; i++) {
      try {
        const result = await parseWorkoutText({ text: extracted[i].text });
        extracted[i].parsed = result;
      } catch {
        extracted[i].error = "Failed to parse";
      }
      setWorkouts([...extracted]);
      setProgress(((i + 1) / extracted.length) * 100);
    }
    setParsing(false);
  }

  async function handleSaveAll() {
    const toSave = workouts.filter((w) => w.parsed && !w.saved);
    if (toSave.length === 0) { toast.error("Nothing to save"); return; }

    setSavingAll(true);
    let savedCount = 0;

    for (const w of workouts) {
      if (!w.parsed || w.saved) continue;
      try {
        await addWorkout({
          date: w.date,
          title: w.parsed.title,
          classType: w.parsed.classType,
          sections: w.parsed.sections.map((s) => ({
            type: s.type,
            sets: s.sets,
            liftName: s.liftName,
            exercises: s.exercises,
            wodScoreType: s.wodScoreType,
            timeCap: s.timeCap,
            wodName: s.wodName,
            rxWeights: s.rxWeights,
            wodFormat: s.wodFormat,
            wodRounds: s.wodRounds,
            wodInterval: s.wodInterval,
            wodDescription: s.wodDescription,
            wodMovements: s.wodMovements,
          })),
        });
        w.saved = true;
        savedCount++;
      } catch {
        w.error = "Failed to save";
      }
      setWorkouts([...workouts]);
    }

    setSavingAll(false);
    toast.success(`Saved ${savedCount} workouts`);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      {/* File input */}
      {workouts.length === 0 && (
        <div className="flex flex-col items-center gap-4 py-12">
          <div className="text-center">
            <p className="font-headline text-lg font-bold text-on-surface">UPLOAD WORKOUTS</p>
            <p className="mt-1 text-xs text-outline">Upload a .xlsx or .csv file with workouts in columns</p>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFile}
            className="hidden"
          />
          <button
            onClick={() => fileRef.current?.click()}
            className="squishy bg-primary px-8 py-3 font-headline text-[11px] font-bold uppercase tracking-widest text-on-primary"
          >
            CHOOSE FILE
          </button>
        </div>
      )}

      {/* Progress */}
      {parsing && (
        <div>
          <div className="mb-1 text-xs text-outline">Parsing workouts... {Math.round(progress)}%</div>
          <div className="h-1 w-full bg-surface-container-highest">
            <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {/* Workout list */}
      {workouts.length > 0 && (
        <>
          {workouts.map((w, i) => (
            <div key={i} className="bg-surface-container">
              <button
                onClick={() => setExpandedIdx(expandedIdx === i ? null : i)}
                className="flex w-full items-center justify-between px-4 py-3 text-left"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs tabular-nums text-outline">{w.date || "No date"}</span>
                  <span className="text-sm font-bold text-on-surface">
                    {w.parsed?.title || `Workout ${i + 1}`}
                  </span>
                  {w.parsed?.classType && (
                    <span className="px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-widest bg-primary/10 text-primary">
                      {w.parsed.classType}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {w.saved && <span className="text-[9px] font-bold text-primary">SAVED</span>}
                  {w.error && <span className="text-[9px] font-bold text-error">{w.error}</span>}
                  {!w.parsed && !w.error && <span className="text-[9px] text-outline">parsing...</span>}
                  <span className="material-symbols-outlined text-sm text-outline">
                    {expandedIdx === i ? "expand_less" : "expand_more"}
                  </span>
                </div>
              </button>

              {expandedIdx === i && w.parsed && (
                <div className="border-t border-surface-container-highest px-4 py-4">
                  <ParsedWorkoutEditor
                    classType={w.parsed.classType}
                    title={w.parsed.title}
                    date={w.date}
                    sections={w.parsed.sections}
                  />
                </div>
              )}
            </div>
          ))}

          {/* Save all */}
          {!parsing && workouts.some((w) => w.parsed && !w.saved) && (
            <button
              onClick={handleSaveAll}
              disabled={savingAll}
              className="squishy w-full bg-primary py-3.5 font-headline text-[11px] font-bold uppercase tracking-widest text-on-primary disabled:opacity-50"
            >
              {savingAll ? "SAVING..." : `SAVE ALL (${workouts.filter((w) => w.parsed && !w.saved).length})`}
            </button>
          )}
        </>
      )}
    </div>
  );
}

function parseSpreadsheetDate(value: string): string {
  // Try ISO format first
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

  // Try common date formats
  const d = new Date(value);
  if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];

  // Excel serial date number
  const serial = parseFloat(value);
  if (!isNaN(serial) && serial > 40000 && serial < 60000) {
    const excelEpoch = new Date(1899, 11, 30);
    const date = new Date(excelEpoch.getTime() + serial * 86400000);
    return date.toISOString().split("T")[0];
  }

  return new Date().toISOString().split("T")[0];
}
