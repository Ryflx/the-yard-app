import { createHash } from "node:crypto";

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
