import { createHash } from "node:crypto";
import type { SectionExercise, WodMovement, PercentageSet } from "@/db/schema";

const MAX_WEIGHT_KG = 1000;
const MAX_REPS = 1000;

export function assertValidWeight(
  weight: number,
  { min = 0, label = "weight" }: { min?: number; label?: string } = {},
): void {
  if (!Number.isFinite(weight) || weight < min || weight > MAX_WEIGHT_KG) {
    throw new Error(`Invalid ${label}`);
  }
}

export function assertValidReps(reps: number | null | undefined): void {
  if (reps === null || reps === undefined) return;
  if (!Number.isInteger(reps) || reps < 0 || reps > MAX_REPS) {
    throw new Error("Invalid reps");
  }
}

export function assertStringLength(
  value: string | null | undefined,
  { max, label }: { max: number; label: string },
): void {
  if (value === null || value === undefined) return;
  if (typeof value !== "string" || value.length > max) {
    throw new Error(`Invalid ${label}`);
  }
}

export function assertOneOf<T extends string>(
  value: string,
  allowed: readonly T[],
  label: string,
): asserts value is T {
  if (!(allowed as readonly string[]).includes(value)) {
    throw new Error(`Invalid ${label}`);
  }
}

export function sanitiseDisplayName(name: string | undefined): string | null {
  if (!name) return null;
  // \p{C} = Unicode "Other" category: control chars, format chars, surrogates,
  // private use. Strip those, keep emoji and ordinary letters/digits.
  const cleaned = name.replace(/\p{C}/gu, "").trim();
  if (cleaned.length === 0) return null;
  if (cleaned.length > 40) {
    throw new Error("Display name too long");
  }
  return cleaned;
}

// Stable opaque identifier for leaderboard responses. Hides the raw Clerk
// user id (which is sensitive enough that it shouldn't be enumerable by every
// signed-in user) while staying deterministic so the client can compare a
// row's userId against currentUserId returned in the same payload.
export function publicUserId(userId: string): string {
  return createHash("sha256").update(userId).digest("hex").slice(0, 16);
}

const MAX_NAME = 100;
const MAX_REPS_STR = 32;
const MAX_WEIGHT_STR = 32;
const MAX_NOTE = 200;
const MAX_EXERCISES_PER_SECTION = 50;
const MAX_MOVEMENTS_PER_SECTION = 50;
const MAX_PERCENTAGE_SETS = 30;

function isStringWithMax(value: unknown, max: number): value is string {
  return typeof value === "string" && value.length <= max;
}

function isOptionalStringWithMax(value: unknown, max: number): value is string | undefined {
  return value === undefined || (typeof value === "string" && value.length <= max);
}

function isNullableStringWithMax(value: unknown, max: number): value is string | null {
  return value === null || (typeof value === "string" && value.length <= max);
}

export function validatePercentageSet(value: unknown): PercentageSet {
  if (!value || typeof value !== "object") throw new Error("Invalid percentageSet");
  const v = value as Record<string, unknown>;
  if (!isStringWithMax(v.reps, MAX_REPS_STR)) throw new Error("Invalid percentageSet.reps");
  if (typeof v.percentage !== "number" || !Number.isFinite(v.percentage) || v.percentage < 0 || v.percentage > 200) {
    throw new Error("Invalid percentageSet.percentage");
  }
  return { reps: v.reps, percentage: v.percentage };
}

export function validateSectionExercise(value: unknown): SectionExercise {
  if (!value || typeof value !== "object") throw new Error("Invalid exercise");
  const v = value as Record<string, unknown>;
  if (!isStringWithMax(v.name, MAX_NAME) || v.name.length === 0) {
    throw new Error("Invalid exercise.name");
  }
  if (!isOptionalStringWithMax(v.reps, MAX_REPS_STR)) throw new Error("Invalid exercise.reps");
  if (!isOptionalStringWithMax(v.weight, MAX_WEIGHT_STR)) throw new Error("Invalid exercise.weight");
  let percentageSets: PercentageSet[] | undefined;
  if (v.percentageSets !== undefined) {
    if (!Array.isArray(v.percentageSets) || v.percentageSets.length > MAX_PERCENTAGE_SETS) {
      throw new Error("Invalid exercise.percentageSets");
    }
    percentageSets = v.percentageSets.map(validatePercentageSet);
  }
  return {
    name: v.name,
    reps: v.reps as string | undefined,
    weight: v.weight as string | undefined,
    percentageSets,
  };
}

export function validateWodMovement(value: unknown): WodMovement {
  if (!value || typeof value !== "object") throw new Error("Invalid wodMovement");
  const v = value as Record<string, unknown>;
  if (!isStringWithMax(v.name, MAX_NAME) || v.name.length === 0) {
    throw new Error("Invalid wodMovement.name");
  }
  if (!isStringWithMax(v.reps, MAX_REPS_STR)) throw new Error("Invalid wodMovement.reps");
  if (!isNullableStringWithMax(v.weight, MAX_WEIGHT_STR)) throw new Error("Invalid wodMovement.weight");
  if (!isNullableStringWithMax(v.unit, 16)) throw new Error("Invalid wodMovement.unit");
  if (!isNullableStringWithMax(v.note, MAX_NOTE)) throw new Error("Invalid wodMovement.note");
  return {
    name: v.name,
    reps: v.reps,
    weight: v.weight as string | null,
    unit: v.unit as string | null,
    note: v.note as string | null,
  };
}

export function validateSectionExercises(value: unknown): SectionExercise[] {
  if (!Array.isArray(value)) throw new Error("Invalid exercises array");
  if (value.length > MAX_EXERCISES_PER_SECTION) throw new Error("Too many exercises");
  return value.map(validateSectionExercise);
}

export function validateWodMovements(value: unknown): WodMovement[] | null {
  if (value === null || value === undefined) return null;
  if (!Array.isArray(value)) throw new Error("Invalid wodMovements array");
  if (value.length > MAX_MOVEMENTS_PER_SECTION) throw new Error("Too many wodMovements");
  return value.map(validateWodMovement);
}
