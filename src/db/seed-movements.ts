import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as dotenv from "dotenv";
import { movements } from "./schema";
import type { MovementCategory } from "./schema";

dotenv.config({ path: ".env.local" });

const neonSql = neon(process.env.DATABASE_URL!);
const db = drizzle(neonSql);

const SEED_MOVEMENTS: { name: string; category: MovementCategory }[] = [
  // Olympic lifts
  { name: "Squat snatch", category: "OLYMPIC" },
  { name: "Squat clean", category: "OLYMPIC" },
  { name: "Squat clean + split jerk", category: "OLYMPIC" },
  { name: "Snatch pull + hang squat snatch", category: "OLYMPIC" },
  { name: "Power clean", category: "OLYMPIC" },
  { name: "Power snatch", category: "OLYMPIC" },
  { name: "Clean and jerk", category: "OLYMPIC" },
  { name: "Hang clean", category: "OLYMPIC" },
  { name: "Hang snatch", category: "OLYMPIC" },
  { name: "Split jerk", category: "OLYMPIC" },
  { name: "Push jerk", category: "OLYMPIC" },

  // Warm up
  { name: "PVC + Squat drills", category: "WARM UP" },
  { name: "500m row", category: "WARM UP" },
  { name: "Foam rolling", category: "WARM UP" },
  { name: "Band pull aparts", category: "WARM UP" },

  // Strength
  { name: "Back squat", category: "STRENGTH" },
  { name: "Front squat", category: "STRENGTH" },
  { name: "Overhead squat", category: "STRENGTH" },
  { name: "Tempo sumo RDL", category: "STRENGTH" },
  { name: "RDL", category: "STRENGTH" },
  { name: "Pendalay row", category: "STRENGTH" },
  { name: "Zercher lunge", category: "STRENGTH" },
  { name: "Zercher squat", category: "STRENGTH" },
  { name: "Walking lunge", category: "STRENGTH" },
  { name: "DB bench press", category: "STRENGTH" },
  { name: "Strict press", category: "STRENGTH" },
  { name: "Push press", category: "STRENGTH" },
  { name: "Snatch pull", category: "STRENGTH" },
  { name: "Clean pull", category: "STRENGTH" },
  { name: "Deadlift", category: "STRENGTH" },

  // Accessory
  { name: "Press ups", category: "ACCESSORY" },
  { name: "Ring rows", category: "ACCESSORY" },
  { name: "Wall walks", category: "ACCESSORY" },
  { name: "Strict pull ups", category: "ACCESSORY" },
  { name: "Chin over bar hold", category: "ACCESSORY" },
  { name: "Double KB/DB russian swings", category: "ACCESSORY" },
  { name: "Single KB american swings", category: "ACCESSORY" },
  { name: "Hip snatch", category: "ACCESSORY" },
  { name: "Muscle clean", category: "ACCESSORY" },
  { name: "GHD sit ups", category: "ACCESSORY" },
  { name: "Plank hold", category: "ACCESSORY" },
  { name: "Face pulls", category: "ACCESSORY" },
  { name: "Banded good mornings", category: "ACCESSORY" },

  // Conditioning
  { name: "Assault bike", category: "CONDITIONING" },
  { name: "Row", category: "CONDITIONING" },
  { name: "Ski erg", category: "CONDITIONING" },
  { name: "Burpees", category: "CONDITIONING" },
];

async function seed() {
  console.log("Seeding movement library...");

  for (const m of SEED_MOVEMENTS) {
    try {
      await db.insert(movements).values(m);
      console.log(`  + ${m.name} (${m.category})`);
    } catch {
      console.log(`  ~ ${m.name} already exists`);
    }
  }

  console.log("Done!");
}

seed().catch(console.error);
