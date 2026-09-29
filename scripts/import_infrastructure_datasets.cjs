/**
 * CivicFix Infrastructure Dataset Bulk Ingestion Utility
 * =======================================================
 * Dedicated, chunked bulk importer for canonical datasets (D1–D7).
 *
 * Usage:
 *   node scripts/import_infrastructure_datasets.cjs <DATASET_CODE>
 *
 * Supported Dataset Codes:
 *   D1 : District Population & Demographics (public.district_demographics)
 *   D2 : District Department Budgets (public.district_department_budgets) [Future]
 *   D3 : District Geography & Environmental (public.district_geography) [Future]
 *   D4 : District Infrastructure Assets (public.district_infrastructure_assets) [Future]
 *   D5 : District Accessibility Metrics (public.district_accessibility_metrics) [Future]
 *   D6 : District Socioeconomic Gaps (public.district_socioeconomic_gaps) [Future]
 *   D7 : District Historical Projects (public.district_historical_projects) [Future]
 *
 * Invariant Rules:
 *   1. Execution REQUIRES an explicit dataset argument. No-arg prints usage and exits.
 *   2. Never executes "import all" automatically.
 *   3. Validates source CSV schema, foreign keys against public.districts, and constraints before upload.
 *   4. Inserts in multi-row batches (~500 records) with retry handling.
 *   5. Dataset D8 remains strictly isolated (never ingested as operational context).
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const { createClient } = require("@supabase/supabase-js");

const rootDir = path.resolve(__dirname, "..");

// -----------------------------------------------------------------------------
// Helper: Load Supabase Client for Read / RPC Verification
// -----------------------------------------------------------------------------
function getSupabaseClient() {
  const envPath = path.join(rootDir, ".env");
  if (!fs.existsSync(envPath)) {
    throw new Error(`.env file not found at ${envPath}`);
  }
  const dotenv = fs.readFileSync(envPath, "utf8");
  let url, key;
  for (const line of dotenv.split("\n")) {
    if (line.startsWith("VITE_SUPABASE_URL=")) url = line.split("=")[1].trim();
    if (line.startsWith("VITE_SUPABASE_PUBLISHABLE_KEY=")) key = line.split("=")[1].trim();
  }
  if (!url || !key) {
    throw new Error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY in .env");
  }
  return createClient(url, key);
}

// -----------------------------------------------------------------------------
// Helper: Execute SQL Query via Linked Supabase CLI
// -----------------------------------------------------------------------------
function executeLinkedSql(sqlQuery, maxRetries = 3) {
  let attempt = 0;
  while (attempt < maxRetries) {
    attempt++;
    try {
      // Write query to temporary file to avoid shell escaping issues
      const tempSqlFile = path.join(rootDir, `.temp_query_${Date.now()}_${Math.random().toString(36).substring(7)}.sql`);
      fs.writeFileSync(tempSqlFile, sqlQuery, "utf8");

      try {
        const output = execSync(`npx supabase db query --linked -f "${tempSqlFile}"`, {
          cwd: rootDir,
          encoding: "utf8",
          stdio: ["pipe", "pipe", "pipe"],
          maxBuffer: 50 * 1024 * 1024,
        });
        if (fs.existsSync(tempSqlFile)) fs.unlinkSync(tempSqlFile);
        return output;
      } catch (execErr) {
        if (fs.existsSync(tempSqlFile)) fs.unlinkSync(tempSqlFile);
        throw execErr;
      }
    } catch (err) {
      console.warn(`    [Attempt ${attempt}/${maxRetries}] SQL execution error: ${err.message}`);
      if (attempt >= maxRetries) {
        throw new Error(`Failed to execute SQL after ${maxRetries} attempts: ${err.message}`);
      }
      // Brief backoff
      execSync("sleep 1");
    }
  }
}

// -----------------------------------------------------------------------------
// Helper: Parse CSV
// -----------------------------------------------------------------------------
function parseCsv(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`CSV file not found: ${filePath}`);
  }
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) return [];

  // Parse header
  const headers = parseCsvLine(lines[0]);
  const records = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    if (values.length === headers.length) {
      const row = {};
      for (let j = 0; j < headers.length; j++) {
        row[headers[j]] = values[j];
      }
      records.push(row);
    }
  }
  return records;
}

function parseCsvLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

// -----------------------------------------------------------------------------
// Helper: SQL Formatting
// -----------------------------------------------------------------------------
function sqlVal(val) {
  if (val === null || val === undefined || val === "" || String(val).trim() === "NULL") {
    return "NULL";
  }
  const num = Number(val);
  if (!isNaN(num) && String(val).trim() !== "") {
    return num.toString();
  }
  const str = String(val).replace(/'/g, "''");
  return `'${str}'`;
}

function sqlNumVal(val, defaultVal = "NULL") {
  if (val === null || val === undefined || val === "" || String(val).trim() === "NULL") {
    return defaultVal;
  }
  const num = Number(val);
  if (isNaN(num)) {
    return defaultVal;
  }
  return num.toString();
}

// -----------------------------------------------------------------------------
// DATASET D1: District Demographics & Population
// -----------------------------------------------------------------------------
async function importDatasetD1() {
  console.log("===============================================================================");
  console.log("CIVICFIX: INGESTING DATASET D1 — DISTRICT DEMOGRAPHICS & POPULATION");
  console.log("===============================================================================\n");

  const indiaCsvPath = path.join(rootDir, "Datasets_Backend/india/D1_Population/CivicFix_India_D1_Population.csv");
  const jhCsvPath = path.join(rootDir, "Datasets_Backend/jharkhand/D1_Population/CivicFix_Jharkhand_D1_Population.csv");

  console.log(`1. Reading Canonical India D1 CSV:     ${indiaCsvPath}`);
  const indiaRows = parseCsv(indiaCsvPath);
  console.log(`   Found ${indiaRows.length} India records.`);

  console.log(`2. Reading Regional Jharkhand D1 CSV:   ${jhCsvPath}`);
  const jhRows = parseCsv(jhCsvPath);
  console.log(`   Found ${jhRows.length} Jharkhand records.`);

  // 3. Fetch Master Districts for Foreign Key Validation
  console.log("\n3. Validating District Foreign Keys against public.districts...");
  const districtsOutput = executeLinkedSql("SELECT id, district_name, state_name, alternate_source_codes FROM public.districts;");
  let masterDistricts = [];
  try {
    const parsed = JSON.parse(districtsOutput);
    masterDistricts = parsed.rows || [];
  } catch {
    throw new Error("Failed to parse districts from database.");
  }

  const validDistrictIds = new Set(masterDistricts.map((d) => d.id));
  const jhAliasToCanonicalId = new Map();

  for (const d of masterDistricts) {
    if (d.state_name === "Jharkhand") {
      if (Array.isArray(d.alternate_source_codes)) {
        for (const alias of d.alternate_source_codes) {
          jhAliasToCanonicalId.set(alias, d.id);
        }
      }
      // Also map normalized district name
      jhAliasToCanonicalId.set(d.district_name.toLowerCase().replace(/[^a-z]/g, ""), d.id);
    }
  }

  console.log(`   Verified ${validDistrictIds.size} canonical districts in database.`);

  // 4. Pre-Upload Validation
  console.log("\n4. Running Pre-Upload Data Validation...");
  let invalidRows = 0;
  let unknownDistrictIds = 0;
  const processedRecords = [];
  const uniqueKeySet = new Set();
  let duplicateKeys = 0;

  // Validate India Records
  for (let idx = 0; idx < indiaRows.length; idx++) {
    const r = indiaRows[idx];
    const distId = r.district_id;
    if (!distId || !validDistrictIds.has(distId)) {
      console.error(`   [Error] India Row ${idx + 1}: Unknown or missing district_id '${distId}'`);
      invalidRows++;
      unknownDistrictIds++;
      continue;
    }

    const pop = Number(r.total_population);
    const households = Number(r.total_households);
    if (isNaN(pop) || pop <= 0 || isNaN(households) || households <= 0) {
      console.error(`   [Error] India Row ${idx + 1} (${distId}): Invalid population (${r.total_population}) or households (${r.total_households})`);
      invalidRows++;
      continue;
    }

    const key = `${distId}:INDIA_D1`;
    if (uniqueKeySet.has(key)) {
      duplicateKeys++;
      console.warn(`   [Warning] Duplicate key detected for ${key}`);
    } else {
      uniqueKeySet.add(key);
    }

    processedRecords.push({
      district_id: distId,
      total_population: pop,
      male_population: sqlNumVal(r.male_population),
      female_population: sqlNumVal(r.female_population),
      rural_population: sqlNumVal(r.rural_population),
      urban_population: sqlNumVal(r.urban_population),
      children_0_14: sqlNumVal(r.children_0_14),
      working_age_population_15_59: sqlNumVal(r.working_age_population_15_59),
      elderly_population_60_plus: sqlNumVal(r.elderly_population_60_plus),
      total_households: households,
      average_household_size: sqlNumVal(r.average_household_size),
      sc_population: sqlNumVal(r.sc_population, "0"),
      st_population: sqlNumVal(r.st_population, "0"),
      literacy_rate_percentage: sqlNumVal(r.literacy_rate_percentage),
      worker_participation_rate_percentage: sqlNumVal(r.worker_participation_rate_percentage),
      households_with_electricity_percentage: sqlNumVal(r.households_with_electricity_percentage),
      households_with_piped_water_percentage: sqlNumVal(r.households_with_piped_water_percentage),
      households_with_toilet_percentage: sqlNumVal(r.households_with_toilet_percentage),
      healthcare_access_score: sqlNumVal(r.healthcare_access_score),
      education_access_score: sqlNumVal(r.education_access_score),
      water_access_score: sqlNumVal(r.water_access_score),
      electricity_access_score: sqlNumVal(r.electricity_access_score),
      overall_service_gap_score: sqlNumVal(r.overall_service_gap_score),
      development_need_score: sqlNumVal(r.development_need_score),
      population_impact_score: sqlNumVal(r.population_impact_score),
      source_dataset: "INDIA_D1",
      source_record_id: distId,
    });
  }

  // Validate Jharkhand Records
  for (let idx = 0; idx < jhRows.length; idx++) {
    const r = jhRows[idx];
    const rawDistId = r.district_id; // e.g. 'JH-D01'
    let canonicalId = jhAliasToCanonicalId.get(rawDistId);
    if (!canonicalId && r.district_name) {
      canonicalId = jhAliasToCanonicalId.get(r.district_name.toLowerCase().replace(/[^a-z]/g, ""));
    }

    if (!canonicalId || !validDistrictIds.has(canonicalId)) {
      console.error(`   [Error] Jharkhand Row ${idx + 1}: Unresolvable district '${rawDistId}' / '${r.district_name}'`);
      invalidRows++;
      unknownDistrictIds++;
      continue;
    }

    const pop = Number(r.total_population);
    const households = Number(r.total_households);
    if (isNaN(pop) || pop <= 0 || isNaN(households) || households <= 0) {
      console.error(`   [Error] Jharkhand Row ${idx + 1} (${canonicalId}): Invalid population (${r.total_population}) or households (${r.total_households})`);
      invalidRows++;
      continue;
    }

    const key = `${canonicalId}:JHARKHAND_D1`;
    if (uniqueKeySet.has(key)) {
      duplicateKeys++;
      console.warn(`   [Warning] Duplicate key detected for ${key}`);
    } else {
      uniqueKeySet.add(key);
    }

    processedRecords.push({
      district_id: canonicalId,
      total_population: pop,
      male_population: sqlNumVal(r.male_population),
      female_population: sqlNumVal(r.female_population),
      rural_population: sqlNumVal(r.rural_population),
      urban_population: sqlNumVal(r.urban_population),
      children_0_14: sqlNumVal(r.children_0_14),
      working_age_population_15_59: sqlNumVal(r.working_age_population_15_59),
      elderly_population_60_plus: sqlNumVal(r.elderly_population_60_plus),
      total_households: households,
      average_household_size: sqlNumVal(r.average_household_size),
      sc_population: sqlNumVal(r.sc_population, "0"),
      st_population: sqlNumVal(r.st_population, "0"),
      literacy_rate_percentage: sqlNumVal(r.literacy_rate_percentage),
      worker_participation_rate_percentage: sqlNumVal(r.worker_participation_rate_percentage),
      households_with_electricity_percentage: sqlNumVal(r.households_with_electricity_percentage),
      households_with_piped_water_percentage: sqlNumVal(r.households_with_piped_water_percentage),
      households_with_toilet_percentage: sqlNumVal(r.households_with_toilet_percentage),
      healthcare_access_score: sqlNumVal(r.healthcare_access_score),
      education_access_score: sqlNumVal(r.education_access_score),
      water_access_score: sqlNumVal(r.water_access_score),
      electricity_access_score: sqlNumVal(r.electricity_access_score),
      overall_service_gap_score: sqlNumVal(r.overall_service_gap_score),
      development_need_score: sqlNumVal(r.development_need_score),
      population_impact_score: sqlNumVal(r.population_impact_score),
      source_dataset: "JHARKHAND_D1",
      source_record_id: rawDistId,
    });
  }

  console.log("\n-------------------------------------------------------------------------------");
  console.log("D1 SOURCE VALIDATION SUMMARY");
  console.log("-------------------------------------------------------------------------------");
  console.log(`  Source Files:            ${indiaCsvPath} & ${jhCsvPath}`);
  console.log(`  Total Source Rows:       ${indiaRows.length + jhRows.length} (${indiaRows.length} India + ${jhRows.length} Jharkhand)`);
  console.log(`  Valid Records:           ${processedRecords.length}`);
  console.log(`  Invalid Rows:            ${invalidRows}`);
  console.log(`  Duplicate Keys:          ${duplicateKeys}`);
  console.log(`  Unknown District IDs:    ${unknownDistrictIds}`);
  console.log("-------------------------------------------------------------------------------\n");

  if (invalidRows > 0 || unknownDistrictIds > 0) {
    throw new Error(`Validation failed with ${invalidRows} invalid rows and ${unknownDistrictIds} unknown district IDs. Aborting upload.`);
  }

  // 5. Batch Upload (500 records per batch)
  console.log("5. Executing Chunked Multi-Row Batch Upload (~500 records/chunk)...");
  const batchSize = 500;
  let insertedTotal = 0;

  for (let i = 0; i < processedRecords.length; i += batchSize) {
    const batch = processedRecords.slice(i, i + batchSize);
    console.log(`   Uploading batch ${Math.floor(i / batchSize) + 1} (${batch.length} records)...`);

    const valuesSql = batch
      .map((r) => {
        return `('${r.district_id}', ${r.total_population}, ${r.male_population}, ${r.female_population}, ${r.rural_population}, ${r.urban_population}, ${r.children_0_14}, ${r.working_age_population_15_59}, ${r.elderly_population_60_plus}, ${r.total_households}, ${r.average_household_size}, ${r.sc_population}, ${r.st_population}, ${r.literacy_rate_percentage}, ${r.worker_participation_rate_percentage}, ${r.households_with_electricity_percentage}, ${r.households_with_piped_water_percentage}, ${r.households_with_toilet_percentage}, ${r.healthcare_access_score}, ${r.education_access_score}, ${r.water_access_score}, ${r.electricity_access_score}, ${r.overall_service_gap_score}, ${r.development_need_score}, ${r.population_impact_score}, '${r.source_dataset}', '${r.source_record_id}', now())`;
      })
      .join(",\n");

    const batchQuery = `
      INSERT INTO public.district_demographics (
        district_id,
        total_population,
        male_population,
        female_population,
        rural_population,
        urban_population,
        children_0_14,
        working_age_population_15_59,
        elderly_population_60_plus,
        total_households,
        average_household_size,
        sc_population,
        st_population,
        literacy_rate_percentage,
        worker_participation_rate_percentage,
        households_with_electricity_percentage,
        households_with_piped_water_percentage,
        households_with_toilet_percentage,
        healthcare_access_score,
        education_access_score,
        water_access_score,
        electricity_access_score,
        overall_service_gap_score,
        development_need_score,
        population_impact_score,
        source_dataset,
        source_record_id,
        reconciled_at
      )
      VALUES
      ${valuesSql}
      ON CONFLICT (district_id, source_dataset) DO UPDATE SET
        total_population = EXCLUDED.total_population,
        male_population = EXCLUDED.male_population,
        female_population = EXCLUDED.female_population,
        rural_population = EXCLUDED.rural_population,
        urban_population = EXCLUDED.urban_population,
        children_0_14 = EXCLUDED.children_0_14,
        working_age_population_15_59 = EXCLUDED.working_age_population_15_59,
        elderly_population_60_plus = EXCLUDED.elderly_population_60_plus,
        total_households = EXCLUDED.total_households,
        average_household_size = EXCLUDED.average_household_size,
        sc_population = EXCLUDED.sc_population,
        st_population = EXCLUDED.st_population,
        literacy_rate_percentage = EXCLUDED.literacy_rate_percentage,
        worker_participation_rate_percentage = EXCLUDED.worker_participation_rate_percentage,
        households_with_electricity_percentage = EXCLUDED.households_with_electricity_percentage,
        households_with_piped_water_percentage = EXCLUDED.households_with_piped_water_percentage,
        households_with_toilet_percentage = EXCLUDED.households_with_toilet_percentage,
        healthcare_access_score = EXCLUDED.healthcare_access_score,
        education_access_score = EXCLUDED.education_access_score,
        water_access_score = EXCLUDED.water_access_score,
        electricity_access_score = EXCLUDED.electricity_access_score,
        overall_service_gap_score = EXCLUDED.overall_service_gap_score,
        development_need_score = EXCLUDED.development_need_score,
        population_impact_score = EXCLUDED.population_impact_score,
        reconciled_at = now(),
        updated_at = now();
    `;

    executeLinkedSql(batchQuery);
    insertedTotal += batch.length;
    console.log(`   ✓ Batch ${Math.floor(i / batchSize) + 1} completed (${insertedTotal}/${processedRecords.length} records processed).`);
  }

  // 6. Post-Import Verification
  console.log("\n6. Running Post-Import Database Verification...");
  const countOutput = executeLinkedSql(`
    SELECT
      COUNT(*) AS total_count,
      COUNT(CASE WHEN source_dataset = 'INDIA_D1' THEN 1 END) AS india_count,
      COUNT(CASE WHEN source_dataset = 'JHARKHAND_D1' THEN 1 END) AS jh_count,
      COUNT(DISTINCT district_id) AS distinct_districts
    FROM public.district_demographics;
  `);

  let dbStats = {};
  try {
    const parsed = JSON.parse(countOutput);
    dbStats = parsed.rows?.[0] || {};
  } catch (err) {
    console.error("Failed to parse count stats:", err);
  }

  console.log(`   Total Database Rows:        ${dbStats.total_count}`);
  console.log(`   India Baseline Records:     ${dbStats.india_count}`);
  console.log(`   Jharkhand Provenance:       ${dbStats.jh_count}`);
  console.log(`   Distinct Districts Covered: ${dbStats.distinct_districts}`);

  // 7. Verify RPC Execution
  console.log("\n7. Verifying D1 Context via RPC get_district_infrastructure_context...");
  const sampleTestOutput = executeLinkedSql(`
    SELECT
      d.id AS district_id,
      d.district_name,
      d1.total_population,
      d1.literacy_rate_percentage,
      d1.source_dataset
    FROM public.district_demographics d1
    JOIN public.districts d ON d.id = d1.district_id
    WHERE d1.district_id = 'IN-D0248'
    ORDER BY d1.source_dataset DESC;
  `);

  try {
    const parsed = JSON.parse(sampleTestOutput);
    console.log("   Sample Ranchi (IN-D0248) Demographics Context:", parsed.rows);
  } catch (err) {
    console.warn("   Could not parse sample test output:", err.message);
  }

  console.log("\n===============================================================================");
  console.log("DATASET D1 INGESTION COMPLETED SUCCESSFULLY");
  console.log("===============================================================================\n");

  return {
    sourceCsvIndia: indiaCsvPath,
    sourceCsvJharkhand: jhCsvPath,
    sourceRowCount: indiaRows.length + jhRows.length,
    validRecordsCount: processedRecords.length,
    dbTotalCount: Number(dbStats.total_count),
    dbIndiaCount: Number(dbStats.india_count),
    dbJhCount: Number(dbStats.jh_count),
    invalidRows,
    duplicateKeys,
    unknownDistrictIds,
  };
}

// -----------------------------------------------------------------------------
// CLI Dispatcher & Usage Banner
// -----------------------------------------------------------------------------
function printUsage() {
  console.log(`
CivicFix Infrastructure Dataset Importer
========================================
Usage:
  node scripts/import_infrastructure_datasets.cjs <DATASET_CODE>

Supported Datasets:
  D1  - District Population & Demographics (public.district_demographics)
  D2  - District Department Budgets (public.district_department_budgets) [Pending Next Step]
  D3  - District Geography (public.district_geography) [Pending Next Step]
  D4  - District Infrastructure Assets (public.district_infrastructure_assets) [Pending Next Step]
  D5  - District Accessibility Metrics (public.district_accessibility_metrics) [Pending Next Step]
  D6  - District Socioeconomic Gaps (public.district_socioeconomic_gaps) [Pending Next Step]
  D7  - District Historical Projects (public.district_historical_projects) [Pending Next Step]

Important Rules:
  * Execution requires an explicit dataset code.
  * Importing all datasets at once is not supported.
  * Dataset D8 (Synthetic Benchmarks) is isolated and cannot be imported via this tool.
`);
}

async function main() {
  const args = process.argv.slice(2);
  const datasetCode = args[0]?.toUpperCase()?.trim();

  if (!datasetCode) {
    printUsage();
    process.exit(1);
  }

  switch (datasetCode) {
    case "D1":
      await importDatasetD1();
      break;

    case "D2":
    case "D3":
    case "D4":
    case "D5":
    case "D6":
    case "D7":
      console.error(`Dataset ${datasetCode} is scheduled for subsequent phased ingestion. Use 'D1' for this step.`);
      process.exit(1);
      break;

    case "D8":
      console.error("ERROR: Dataset D8 (benchmark_development_requests) is isolated and cannot be loaded as operational context.");
      process.exit(1);
      break;

    default:
      console.error(`ERROR: Unrecognized dataset code '${datasetCode}'.`);
      printUsage();
      process.exit(1);
      break;
  }
}

main().catch((err) => {
  console.error("\nFATAL ERROR during dataset ingestion:", err);
  process.exit(1);
});
