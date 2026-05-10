// Stamps a unique CACHE_NAME into public/sw.js at build time so every Vercel
// deploy ships a byte-different service worker. Without this, sw.js stays
// identical across deploys and the browser never fires `updatefound`, so open
// PWA tabs keep serving the old app shell.
//
// Resolution order for the version stamp:
//   1. VERCEL_GIT_COMMIT_SHA  (set by Vercel on every build)
//   2. VERCEL_DEPLOYMENT_ID   (Vercel deploy id fallback)
//   3. local `git rev-parse --short HEAD`
//   4. Date.now()             (last-resort, e.g. CI without git)

import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

function resolveVersion() {
  const sha = process.env.VERCEL_GIT_COMMIT_SHA;
  if (sha) return sha.slice(0, 8);

  const deployId = process.env.VERCEL_DEPLOYMENT_ID;
  if (deployId) return deployId.slice(0, 8);

  try {
    return execSync("git rev-parse --short HEAD", {
      stdio: ["ignore", "pipe", "ignore"],
    })
      .toString()
      .trim();
  } catch {
    return String(Date.now());
  }
}

const version = resolveVersion();
const path = "public/sw.js";
const content = readFileSync(path, "utf-8");
const pattern = /const CACHE_NAME = "yard-[^"]+";/;

if (!pattern.test(content)) {
  console.error(
    "✗ build-sw.mjs: CACHE_NAME pattern not found in public/sw.js — sw won't be versioned.",
  );
  process.exit(1);
}

const updated = content.replace(pattern, `const CACHE_NAME = "yard-${version}";`);
writeFileSync(path, updated);
console.log(`✓ sw.js cache name → yard-${version}`);
