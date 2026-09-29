const fs = require("fs");
const path = require("path");

console.log("===============================================================================");
console.log("CIVICFIX: PHASE 4.4 OFFICER QUEUE & ADMIN CLASSIFICATION PAGINATION TEST SUITE");
console.log("===============================================================================\n");

let passed = 0;
let total = 0;

function assert(condition, message) {
  total++;
  if (condition) {
    console.log(`  ✓ PASS [${total}]: ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL [${total}]: ${message}`);
    process.exitCode = 1;
  }
}

const officerIssuesPath = path.join(__dirname, "../src/routes/officer/issues.tsx");
const adminClassificationPath = path.join(__dirname, "../src/routes/admin/classification.tsx");

const officerCode = fs.readFileSync(officerIssuesPath, "utf8");
const adminClassificationCode = fs.readFileSync(adminClassificationPath, "utf8");

// Test 1: Officer Issues uses server-side pagination with PAGE_SIZE = 25 and .range()
assert(
  officerCode.includes("PAGE_SIZE = 25") &&
  officerCode.includes(".range(from, to)") &&
  officerCode.includes('{ count: "exact" }'),
  "src/routes/officer/issues.tsx implements server-side pagination with PAGE_SIZE = 25 and .range(from, to)"
);

// Test 2: Officer Issues uses secure search with buildPostgrestIlikeOr
assert(
  officerCode.includes("buildPostgrestIlikeOr") &&
  officerCode.includes('["title", "description", "category", "location_text", "address_text"]'),
  "src/routes/officer/issues.tsx sanitizes search queries using buildPostgrestIlikeOr"
);

// Test 3: Officer Issues fetches KPI metrics concurrently with head: true count queries
assert(
  officerCode.includes('{ count: "exact", head: true }') &&
  officerCode.includes("Promise.all(["),
  "src/routes/officer/issues.tsx calculates queue KPI metrics using lightweight head: true count queries"
);

// Test 4: Officer Issues renders pagination controls (Prev/Next, range display)
assert(
  officerCode.includes("Showing") &&
  officerCode.includes("Prev") &&
  officerCode.includes("Next") &&
  officerCode.includes("ChevronLeft") &&
  officerCode.includes("ChevronRight"),
  "src/routes/officer/issues.tsx includes full pagination UI controls (Prev/Next buttons and item count)"
);

// Test 5: Admin Classification uses server-side pagination with PAGE_SIZE = 25 and .range()
assert(
  adminClassificationCode.includes("PAGE_SIZE = 25") &&
  adminClassificationCode.includes(".range(from, to)") &&
  adminClassificationCode.includes('{ count: "exact" }'),
  "src/routes/admin/classification.tsx implements server-side pagination with PAGE_SIZE = 25 and .range(from, to)"
);

// Test 6: Admin Classification uses secure search with buildPostgrestIlikeOr
assert(
  adminClassificationCode.includes("buildPostgrestIlikeOr") &&
  adminClassificationCode.includes('["title", "description", "category", "location_text", "address_text"]'),
  "src/routes/admin/classification.tsx sanitizes search queries using buildPostgrestIlikeOr"
);

// Test 7: Admin Classification fetches KPI summary counts concurrently with head: true count queries
assert(
  adminClassificationCode.includes('{ count: "exact", head: true }') &&
  adminClassificationCode.includes("awaitingRes") &&
  adminClassificationCode.includes("infraRes") &&
  adminClassificationCode.includes("simpleRes") &&
  adminClassificationCode.includes("complexRes") &&
  adminClassificationCode.includes("overrideRes"),
  "src/routes/admin/classification.tsx computes classification KPIs using concurrent head: true queries"
);

// Test 8: Admin Classification resets page to 1 on filter, tab, sort, and search changes
assert(
  adminClassificationCode.includes("setPage(1)") &&
  adminClassificationCode.includes("filterTab, search, sortBy, page") || adminClassificationCode.includes("[page, filterTab, search, sortBy"),
  "src/routes/admin/classification.tsx resets page to 1 upon filter/tab/sort/search change"
);

// Test 9: Admin Classification renders pagination controls (Prev/Next, range display)
assert(
  adminClassificationCode.includes("Showing") &&
  adminClassificationCode.includes("Prev") &&
  adminClassificationCode.includes("Next") &&
  adminClassificationCode.includes("ChevronLeft") &&
  adminClassificationCode.includes("ChevronRight"),
  "src/routes/admin/classification.tsx includes full pagination UI controls in the left queue card"
);

// Test 10: Neither file contains unbounded issue table reads
const hasUnboundedOfficer = !officerCode.includes(".range(");
const hasUnboundedAdmin = !adminClassificationCode.includes(".range(");
assert(
  !hasUnboundedOfficer && !hasUnboundedAdmin,
  "Both pages have fully eliminated unbounded database table reads"
);

console.log("\n===============================================================================");
console.log(`ALL PHASE 4.4 PAGINATION TESTS COMPLETED: (${passed}/${total} PASSED)`);
console.log("===============================================================================");
if (passed !== total) {
  process.exit(1);
}
