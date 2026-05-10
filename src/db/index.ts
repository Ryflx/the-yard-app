import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// Lazy-init via a Proxy so importing this module never throws on missing
// DATABASE_URL. Next.js 16 collects route-segment config for every route at
// build time, which evaluates the import graph; if `db` were initialised at
// module top, a missing env var (e.g. on a Vercel Preview without secrets)
// would crash that pass and fail the whole build. Real DB calls still throw
// the helpful error on first use.
type Db = NeonHttpDatabase<typeof schema>;

let instance: Db | null = null;

function ensure(): Db {
  if (instance) return instance;
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
  }
  const sql = neon(process.env.DATABASE_URL);
  instance = drizzle(sql, { schema });
  return instance;
}

export const db = new Proxy({} as Db, {
  get(_target, prop, receiver) {
    return Reflect.get(ensure(), prop, receiver);
  },
}) as Db;
