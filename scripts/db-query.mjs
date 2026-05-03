#!/usr/bin/env node
// Run a SQL query against the cloud DB via the Management API.
// Service role — bypasses RLS, useful for debugging.
//
// Usage: SUPABASE_PROJECT_REF=... SUPABASE_ACCESS_TOKEN=... node scripts/db-query.mjs "select ..."

const ref = process.env.SUPABASE_PROJECT_REF;
const token = process.env.SUPABASE_ACCESS_TOKEN;
const query = process.argv.slice(2).join(" ");

if (!ref || !token || !query) {
  console.error("Usage: node db-query.mjs '<sql>'");
  process.exit(2);
}

const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
  method: "POST",
  headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  body: JSON.stringify({ query }),
});

const body = await res.json();
if (!res.ok) {
  console.error(`HTTP ${res.status}:`, body);
  process.exit(1);
}
console.log(JSON.stringify(body, null, 2));
