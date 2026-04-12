import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { db } from "./index";
import { movements } from "./schema";
import type { MovementCategory } from "./schema";

const CROSSFIT_MOVEMENTS: { name: string; category: MovementCategory }[] = [
  // Gymnastics
  { name: "Toes to bar", category: "GYMNASTICS" },
  { name: "Pull ups", category: "GYMNASTICS" },
  { name: "Chest to bar pull ups", category: "GYMNASTICS" },
  { name: "Ring muscle ups", category: "GYMNASTICS" },
  { name: "Bar muscle ups", category: "GYMNASTICS" },
  { name: "Handstand push ups", category: "GYMNASTICS" },
  { name: "Box HSPUs", category: "GYMNASTICS" },
  { name: "Handstand walk", category: "GYMNASTICS" },
  { name: "Ring dips", category: "GYMNASTICS" },
  { name: "Rope climbs", category: "GYMNASTICS" },
  { name: "Double unders", category: "GYMNASTICS" },
  { name: "Single unders", category: "GYMNASTICS" },
  { name: "Hanging knee raises", category: "GYMNASTICS" },
  { name: "Ring rows", category: "GYMNASTICS" },
  { name: "Scapular pull ups", category: "GYMNASTICS" },
  { name: "Ring support hold", category: "GYMNASTICS" },
  { name: "Chin over bar hold", category: "GYMNASTICS" },
  { name: "Negative HSPUs", category: "GYMNASTICS" },
  { name: "Kipping pull ups", category: "GYMNASTICS" },
  { name: "Strict pull ups", category: "GYMNASTICS" },
  { name: "Sit ups", category: "GYMNASTICS" },
  // Conditioning
  { name: "Echo bike", category: "CONDITIONING" },
  { name: "200-m run", category: "CONDITIONING" },
  { name: "400-m run", category: "CONDITIONING" },
  { name: "600-m run", category: "CONDITIONING" },
  { name: "800-m run", category: "CONDITIONING" },
  { name: "Box jump overs", category: "CONDITIONING" },
  { name: "Box step overs", category: "CONDITIONING" },
  { name: "Burpees", category: "CONDITIONING" },
  { name: "Skipping", category: "CONDITIONING" },
  // Strength (CrossFit-specific)
  { name: "Sumo deadlift", category: "STRENGTH" },
  { name: "Hybrid deadlift", category: "STRENGTH" },
  { name: "Swiss bar bench press", category: "STRENGTH" },
  { name: "Kettlebell swings", category: "STRENGTH" },
  { name: "Russian KBS", category: "STRENGTH" },
  { name: "American KBS", category: "STRENGTH" },
  { name: "Deadstop KBS", category: "STRENGTH" },
  { name: "KB good mornings", category: "STRENGTH" },
  // Warm up / accessory additions
  { name: "Banded pass throughs", category: "WARM UP" },
  { name: "Tall plank rotations", category: "WARM UP" },
  { name: "Inchworm press ups", category: "WARM UP" },
  { name: "Front rack openers", category: "WARM UP" },
  { name: "Tempo front squats", category: "WARM UP" },
  { name: "GSA", category: "WARM UP" },
  { name: "Seal dips", category: "WARM UP" },
  { name: "Single arm bridges", category: "WARM UP" },
  { name: "Warrior squats", category: "WARM UP" },
  { name: "Cossack squats", category: "WARM UP" },
  { name: "Kang squats", category: "WARM UP" },
  { name: "Press ups to down dog", category: "WARM UP" },
  { name: "Press ups to downward dog", category: "WARM UP" },
  { name: "HS hold", category: "GYMNASTICS" },
];

async function seed() {
  console.log("Seeding CrossFit movements...");
  let added = 0;
  for (const m of CROSSFIT_MOVEMENTS) {
    try {
      await db.insert(movements).values(m);
      added++;
    } catch {
      // already exists (unique constraint), skip
    }
  }
  console.log(`Done. Added ${added} new movements (skipped ${CROSSFIT_MOVEMENTS.length - added} duplicates).`);
  process.exit(0);
}

seed();
