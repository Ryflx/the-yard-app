import Anthropic from "@anthropic-ai/sdk";
import type { DraftSession, LLMPersonalisation, WeaknessSignal } from "./types";
import { parseAndValidateLLMResponse, type ValidationEnv } from "./validator";

const MODEL = "claude-haiku-4-5-20251001";

export interface PersonaliseInput {
  goalSummary: string;
  weaknessSignals: WeaknessSignal[];
  draft: DraftSession[];
  activityDigest: string; // pre-formatted summary, no PII
  env: ValidationEnv;
}

export interface PersonaliseResult {
  personalisation: LLMPersonalisation;
  llmFallbackUsed: boolean;
  modelUsed: string | null;
}

function buildPrompt(input: PersonaliseInput): string {
  return [
    "You are a CrossFit programming assistant. You will receive a user's goals, weakness signals, a draft 8-week plan, and recent activity. Personalise the plan.",
    "",
    "## Goal",
    input.goalSummary,
    "",
    "## Weakness signals (top 5, ranked)",
    input.weaknessSignals.map((s) => `- skill ${s.skillId} (${(s.signalStrength * 100).toFixed(0)}%): ${s.reason}`).join("\n") || "(none)",
    "",
    "## Draft schedule",
    input.draft.map((d) => `- session ${d.sessionIndex}: ${d.courseName} — ${d.drillTitle} on ${d.plannedDate} (${d.plannedSlotMinutes}min, patterns: ${d.primaryMovementPatterns.join(",")})`).join("\n"),
    "",
    "## Recent activity (last 14 days)",
    input.activityDigest,
    "",
    "## Your task",
    "Return STRICT JSON with this shape (no markdown, no commentary):",
    "{",
    '  "intro": "2-3 lines about this plan",',
    '  "sessionRationales": [{"sessionIndex": number, "rationale": "one line"}],',
    '  "swaps": [{"sessionIndex": number, "newDrillId": number, "reason": "one line"}]',
    "}",
    "",
    "Rules:",
    "- Swaps may only replace a session's drill with another drill from the SAME skill (course). If unsure, do not swap.",
    "- A replacement drill must fit the original session's slot duration.",
    "- Provide at most one rationale per session.",
    "- Keep intros and reasons under 200 characters.",
  ].join("\n");
}

export async function personalisePlan(input: PersonaliseInput): Promise<PersonaliseResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      personalisation: { intro: "", sessionRationales: [], swaps: [] },
      llmFallbackUsed: true,
      modelUsed: null,
    };
  }

  const client = new Anthropic({ apiKey });
  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 4000,
      messages: [{ role: "user", content: buildPrompt(input) }],
    });
    const textBlock = response.content.find((b) => b.type === "text");
    const raw = textBlock && textBlock.type === "text" ? textBlock.text : "";
    const personalisation = parseAndValidateLLMResponse(raw, input.draft, input.env);
    return { personalisation, llmFallbackUsed: false, modelUsed: MODEL };
  } catch (err) {
    console.warn("[programming] LLM personalisation failed, falling back:", err);
    return {
      personalisation: { intro: "", sessionRationales: [], swaps: [] },
      llmFallbackUsed: true,
      modelUsed: MODEL,
    };
  }
}
