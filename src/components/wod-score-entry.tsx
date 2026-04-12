"use client";

import { useState } from "react";
import { logWodResult } from "@/app/actions";
import type { WodScoreType, RxLevel } from "@/db/schema";
import { assessWodScore, type WodTierResult } from "@/lib/benchmark-wods";
import type { Sex } from "@/lib/strength-standards";
import { toast } from "sonner";
import { RxLevelTabs } from "./rx-level-tabs";
import { InlineWodLeaderboard } from "./inline-wod-leaderboard";

interface WodScoreEntryProps {
  workoutId: number;
  sectionId: number;
  scoreType: WodScoreType;
  timeCap?: number | null;
  rxWeights?: string | null;
  wodName?: string | null;
  userSex?: Sex | null;
  existingScore?: {
    scoreValue: string;
    rxLevel: RxLevel;
  } | null;
}

export function WodScoreEntry({
  workoutId,
  sectionId,
  scoreType,
  timeCap,
  rxWeights,
  wodName,
  userSex,
  existingScore,
}: WodScoreEntryProps) {
  const [logging, setLogging] = useState(false);
  const [logged, setLogged] = useState(!!existingScore);
  const [displayScore, setDisplayScore] = useState(existingScore?.scoreValue || "");
  const [displayRxLevel, setDisplayRxLevel] = useState<RxLevel>(existingScore?.rxLevel || "SCALED");
  const [tierResult, setTierResult] = useState<WodTierResult | null>(() => {
    if (!existingScore || !wodName || !userSex) return null;
    const st = scoreType === "INTERVAL" ? "TIME" : scoreType;
    if (st !== "TIME" && st !== "ROUNDS_REPS") return null;
    return assessWodScore(wodName, existingScore.scoreValue, st, userSex);
  });

  const [minutes, setMinutes] = useState("");
  const [seconds, setSeconds] = useState("");
  const [rounds, setRounds] = useState("");
  const [reps, setReps] = useState("");
  const [rxLevel, setRxLevel] = useState<RxLevel>("RX");
  const [isPublic, setIsPublic] = useState(true);

  async function handleSubmit() {
    let scoreValue = "";

    if (scoreType === "TIME" || scoreType === "INTERVAL") {
      const m = parseInt(minutes) || 0;
      const s = parseInt(seconds) || 0;
      if (m === 0 && s === 0) { toast.error("Enter a time"); return; }
      scoreValue = `${m}:${String(s).padStart(2, "0")}`;
    } else if (scoreType === "ROUNDS_REPS") {
      const r = parseInt(rounds) || 0;
      const rep = parseInt(reps) || 0;
      if (r === 0 && rep === 0) { toast.error("Enter rounds and reps"); return; }
      scoreValue = rep > 0 ? `${r}+${rep}` : `${r}`;
    } else {
      scoreValue = rounds || "0";
      if (!scoreValue || scoreValue === "0") { toast.error("Enter a value"); return; }
    }

    setLogging(true);
    try {
      await logWodResult({ workoutId, sectionId, scoreType, scoreValue, rxLevel, public: isPublic });
      toast.success("Score logged!");
      setLogged(true);
      setDisplayScore(scoreValue);
      setDisplayRxLevel(rxLevel);

      if (wodName && userSex) {
        const st = scoreType === "INTERVAL" ? "TIME" : scoreType;
        if (st === "TIME" || st === "ROUNDS_REPS") {
          setTierResult(assessWodScore(wodName, scoreValue, st, userSex));
        }
      }
    } catch {
      toast.error("Failed to log score");
    } finally {
      setLogging(false);
    }
  }

  if (logged) {
    return (
      <div className="flex flex-col gap-0">
        <div className="flex items-center justify-between bg-primary/10 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-lg text-primary">check_circle</span>
            <div>
              <span className="font-headline text-xl font-black text-primary">
                {displayScore}
              </span>
              <span className={`ml-2 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest ${
                displayRxLevel === "RX_PLUS"
                  ? "bg-yellow-500 text-black"
                  : displayRxLevel === "RX"
                    ? "bg-primary text-on-primary"
                    : "bg-surface-container-highest text-on-surface-variant"
              }`}>
                {displayRxLevel === "RX_PLUS" ? "RX+" : displayRxLevel}
              </span>
              {!isPublic && (
                <span className="ml-2 text-[9px] text-outline">
                  <span className="material-symbols-outlined text-xs">visibility_off</span>
                </span>
              )}
            </div>
          </div>
          <button
            onClick={() => { setLogged(false); setDisplayScore(""); setDisplayRxLevel("SCALED"); setTierResult(null); }}
            className="text-[10px] font-bold uppercase tracking-widest text-primary hover:underline"
          >
            LOG AGAIN
          </button>
        </div>
        {tierResult && (
          <div
            className="flex items-center gap-4 px-5 py-4"
            style={{ backgroundColor: tierResult.tier.color + "15" }}
          >
            <span
              className="material-symbols-outlined text-3xl"
              style={{ color: tierResult.tier.color, fontVariationSettings: "'FILL' 1" }}
            >
              {tierResult.tier.icon}
            </span>
            <div>
              <p className="font-headline text-lg font-black uppercase tracking-tight" style={{ color: tierResult.tier.color }}>
                {tierResult.tier.name}
              </p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                {tierResult.percentileLabel} · {tierResult.benchmarkWod.name.toUpperCase()} BENCHMARK
              </p>
            </div>
          </div>
        )}
        <InlineWodLeaderboard
          sectionId={sectionId}
          defaultRxLevel={displayRxLevel}
          wodName={wodName}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 bg-surface-container-high px-5 py-4">
      <span className="font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
        LOG YOUR SCORE
      </span>

      {(scoreType === "TIME" || scoreType === "INTERVAL") && (
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
            placeholder="MM"
            min="0"
            className="w-16 bg-surface-container px-3 py-2 text-center font-headline text-lg font-bold text-on-surface outline-none placeholder:text-outline"
          />
          <span className="font-headline text-lg font-bold text-outline">:</span>
          <input
            type="number"
            value={seconds}
            onChange={(e) => setSeconds(e.target.value)}
            placeholder="SS"
            min="0"
            max="59"
            className="w-16 bg-surface-container px-3 py-2 text-center font-headline text-lg font-bold text-on-surface outline-none placeholder:text-outline"
          />
          {timeCap && (
            <span className="ml-2 text-[10px] font-bold uppercase tracking-widest text-outline">
              CAP {Math.floor(timeCap / 60)}:{String(timeCap % 60).padStart(2, "0")}
            </span>
          )}
        </div>
      )}

      {scoreType === "ROUNDS_REPS" && (
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={rounds}
            onChange={(e) => setRounds(e.target.value)}
            placeholder="RNDS"
            min="0"
            className="w-16 bg-surface-container px-3 py-2 text-center font-headline text-lg font-bold text-on-surface outline-none placeholder:text-outline"
          />
          <span className="font-headline text-lg font-bold text-outline">+</span>
          <input
            type="number"
            value={reps}
            onChange={(e) => setReps(e.target.value)}
            placeholder="REPS"
            min="0"
            className="w-16 bg-surface-container px-3 py-2 text-center font-headline text-lg font-bold text-on-surface outline-none placeholder:text-outline"
          />
        </div>
      )}

      {(scoreType === "LOAD" || scoreType === "CALS" || scoreType === "DISTANCE") && (
        <input
          type="text"
          value={rounds}
          onChange={(e) => setRounds(e.target.value)}
          placeholder={scoreType === "LOAD" ? "kg" : scoreType === "CALS" ? "cals" : "m"}
          className="w-32 bg-surface-container px-3 py-2 text-center font-headline text-lg font-bold text-on-surface outline-none placeholder:text-outline"
        />
      )}

      <RxLevelTabs value={rxLevel} onChange={setRxLevel} />

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setIsPublic(!isPublic)}
          className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant"
        >
          <span className="material-symbols-outlined text-sm">
            {isPublic ? "visibility" : "visibility_off"}
          </span>
          {isPublic ? "Public" : "Private"}
        </button>

        <button
          onClick={handleSubmit}
          disabled={logging}
          className="squishy bg-primary px-6 py-2.5 font-headline text-[11px] font-bold uppercase tracking-widest text-on-primary disabled:opacity-50"
        >
          {logging ? "..." : "LOG SCORE"}
        </button>
      </div>
    </div>
  );
}
