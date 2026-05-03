#!/usr/bin/env node
// Run the pgTAP suite against a Supabase Cloud DB via the Management API.
// Avoids direct DB connection which can time out on IPv6-only free-tier endpoints.
//
// Usage:
//   SUPABASE_PROJECT_REF=... SUPABASE_ACCESS_TOKEN=... node scripts/run-pgtap.mjs supabase/tests/rls.sql

import { readFileSync } from "node:fs";

const ref = process.env.SUPABASE_PROJECT_REF;
const token = process.env.SUPABASE_ACCESS_TOKEN;
const file = process.argv[2];

if (!ref || !token || !file) {
  console.error("Need SUPABASE_PROJECT_REF, SUPABASE_ACCESS_TOKEN, and a file path.");
  process.exit(2);
}

const sql = readFileSync(file, "utf8");

const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ query: sql }),
});

const text = await res.text();
let body;
try {
  body = JSON.parse(text);
} catch {
  body = text;
}

if (!res.ok) {
  console.error(`HTTP ${res.status}:`, body);
  process.exit(1);
}

// Each statement returns its own result set; pgTAP rows have a single text column.
const lines = [];
function collect(node) {
  if (Array.isArray(node)) {
    for (const item of node) collect(item);
  } else if (node && typeof node === "object") {
    for (const v of Object.values(node)) {
      if (typeof v === "string") lines.push(v);
      else collect(v);
    }
  } else if (typeof node === "string") {
    lines.push(node);
  }
}
collect(body);

let pass = 0, fail = 0;
const failures = [];
for (const line of lines) {
  for (const sub of String(line).split("\n")) {
    if (/^\s*ok\s+\d+/.test(sub)) {
      pass++;
      console.log(sub);
    } else if (/^\s*not ok\s+\d+/.test(sub)) {
      fail++;
      failures.push(sub);
      console.log(sub);
    } else if (sub.startsWith("# ") || /^\s*\d+\.\.\d+/.test(sub)) {
      console.log(sub);
    }
  }
}

console.log(`\n--- ${pass} passed, ${fail} failed ---`);
if (fail) {
  console.log("Failures:");
  for (const f of failures) console.log("  " + f);
  process.exit(1);
}
