const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const dotenv = fs.readFileSync(path.join(__dirname, "../.env"), "utf8");
let url, key;
for (const line of dotenv.split("\n")) {
  if (line.startsWith("VITE_SUPABASE_URL=")) url = line.split("=")[1].trim();
  if (line.startsWith("VITE_SUPABASE_PUBLISHABLE_KEY=")) key = line.split("=")[1].trim();
}

const supabase = createClient(url, key);

async function checkCounts() {
  const tables = [
    "districts",
    "department_planning_sectors",
    "district_demographics",
    "district_department_budgets",
    "district_geography",
    "district_infrastructure_assets",
    "district_accessibility_metrics",
    "district_socioeconomic_gaps",
    "district_historical_projects",
    "benchmark_development_requests"
  ];

  console.log("=========================================");
  console.log("LIVE SUPABASE DATABASE ROW COUNTS AUDIT");
  console.log("=========================================");
  for (const t of tables) {
    const { count, error } = await supabase.from(t).select("*", { count: "exact", head: true });
    if (error) {
      console.log(`Table ${t}: ERROR -> ${error.message}`);
    } else {
      console.log(`Table ${t.padEnd(32)}: ${count} rows`);
    }
  }
}

checkCounts().catch(console.error);
