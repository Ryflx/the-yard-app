import { config } from "dotenv";
config({ path: ".env.local" });
import { createClerkClient } from "@clerk/backend";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { userProfiles } from "./schema";
import { eq } from "drizzle-orm";

const EMAIL = "liam.coates@gmail.com";

async function main() {
  const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! });
  const users = await clerk.users.getUserList({ emailAddress: [EMAIL] });

  if (users.data.length === 0) {
    console.log(`No Clerk user found for ${EMAIL}`);
    process.exit(1);
  }

  const clerkUserId = users.data[0].id;
  console.log(`Found Clerk user: ${clerkUserId}`);

  const sql = neon(process.env.DATABASE_URL!);
  const db = drizzle(sql);

  const existing = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.userId, clerkUserId));

  if (existing.length > 0) {
    await db
      .update(userProfiles)
      .set({ role: "admin", updatedAt: new Date() })
      .where(eq(userProfiles.userId, clerkUserId));
    console.log(`Updated ${EMAIL} to admin`);
  } else {
    await db.insert(userProfiles).values({
      userId: clerkUserId,
      role: "admin",
    });
    console.log(`Created admin profile for ${EMAIL}`);
  }

  console.log("Done!");
}

main().catch(console.error);
