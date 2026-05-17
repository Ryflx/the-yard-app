import type { DraftSession, LLMPersonalisation } from "./types";

export interface ValidationEnv {
  allowedDrillsBySkill: Map<number, number[]>;
  drillMinutes: Map<number, number>;
  drillSkill: Map<number, number>;
}

export function validatePersonalisation(
  p: LLMPersonalisation,
  draft: DraftSession[],
  env: ValidationEnv
): LLMPersonalisation {
  const rationales = p.sessionRationales.filter((r) => r.sessionIndex >= 0 && r.sessionIndex < draft.length);

  const swaps = p.swaps.filter((s) => {
    if (s.sessionIndex < 0 || s.sessionIndex >= draft.length) return false;
    const session = draft[s.sessionIndex];
    const drillSkill = env.drillSkill.get(s.newDrillId);
    if (drillSkill === undefined) return false;
    if (drillSkill !== session.skillId) return false;
    const allowed = env.allowedDrillsBySkill.get(session.skillId) ?? [];
    if (!allowed.includes(s.newDrillId)) return false;
    const mins = env.drillMinutes.get(s.newDrillId);
    if (mins === undefined) return false;
    if (mins > session.plannedSlotMinutes) return false;
    return true;
  });

  return { intro: p.intro ?? "", sessionRationales: rationales, swaps };
}

export function parseAndValidateLLMResponse(
  raw: string,
  draft: DraftSession[],
  env: ValidationEnv
): LLMPersonalisation {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("LLM response is not valid JSON");
  }
  if (typeof parsed !== "object" || parsed === null) throw new Error("LLM response must be a JSON object");
  const obj = parsed as Record<string, unknown>;
  if (typeof obj.intro !== "string") throw new Error("LLM response missing 'intro' string");
  if (!Array.isArray(obj.sessionRationales)) throw new Error("LLM response missing 'sessionRationales' array");
  if (!Array.isArray(obj.swaps)) throw new Error("LLM response missing 'swaps' array");
  for (const r of obj.sessionRationales as unknown[]) {
    if (typeof r !== "object" || r === null) throw new Error("sessionRationales contains non-object");
    const rr = r as Record<string, unknown>;
    if (typeof rr.sessionIndex !== "number" || typeof rr.rationale !== "string") {
      throw new Error("sessionRationales entry missing fields");
    }
  }
  for (const s of obj.swaps as unknown[]) {
    if (typeof s !== "object" || s === null) throw new Error("swaps contains non-object");
    const ss = s as Record<string, unknown>;
    if (typeof ss.sessionIndex !== "number" || typeof ss.newDrillId !== "number" || typeof ss.reason !== "string") {
      throw new Error("swaps entry missing fields");
    }
  }
  return validatePersonalisation(obj as unknown as LLMPersonalisation, draft, env);
}
