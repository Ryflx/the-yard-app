import type { MovementPattern } from "@/db/schema"

interface PatternRule {
  match: RegExp
  patterns: MovementPattern[]
}

const RULES: PatternRule[] = [
  { match: /\b(muscle ?up|mu)\b/i, patterns: ["pull", "press"] },
  { match: /\b(handstand walk|hs walk)\b/i, patterns: ["press", "overhead"] },
  { match: /\b(handstand push ?up|hspu)\b/i, patterns: ["press", "overhead"] },
  { match: /\b(handstand hold|kick ?up|wall walk)\b/i, patterns: ["press", "overhead"] },
  { match: /\b(double unders?|du)\b/i, patterns: ["conditioning", "jump"] },
  { match: /\b(single unders?|jump rope)\b/i, patterns: ["conditioning", "jump"] },
  { match: /\b(toes to bar|t2b|ttb)\b/i, patterns: ["pull", "core"] },
  { match: /\b(kipping|butterfly|strict) pull[- ]?up/i, patterns: ["pull"] },
  { match: /\b(pull[- ]?up|chin[- ]?up|c2b|chest to bar)\b/i, patterns: ["pull"] },
  { match: /\b(rope climb)\b/i, patterns: ["pull", "core"] },
  { match: /\b(pistol|single leg squat)\b/i, patterns: ["squat", "unilateral"] },
  { match: /\b(back squat|front squat|overhead squat|air squat)\b/i, patterns: ["squat"] },
  { match: /\b(deadlift|clean pull|snatch pull|rdl)\b/i, patterns: ["hinge"] },
  { match: /\b(clean|snatch|jerk|press|push press|push jerk|thruster)\b/i, patterns: ["press", "overhead"] },
  { match: /\b(plank|hollow|core|sit ?up|v[- ]?up|gh\s*sit)\b/i, patterns: ["core"] },
  { match: /\b(burpee|row|bike|ski|run|jog)\b/i, patterns: ["conditioning"] },
]

export function classifyMovements(movements: string[]): MovementPattern[] {
  const out = new Set<MovementPattern>()
  for (const m of movements) {
    for (const rule of RULES) {
      if (rule.match.test(m)) {
        for (const p of rule.patterns) out.add(p)
      }
    }
  }
  return Array.from(out)
}
