/**
 * Frontend Build & Bundle Performance Analysis
 * =============================================
 * Inspects production build outputs:
 * - Bundle size distribution
 * - Largest JavaScript & CSS chunks
 * - Route chunk breakdown
 * - Initial load weight
 */

const fs = require('fs');
const path = require('path');

function analyzeFrontendPerformance() {
  console.log("================================================================================");
  console.log("CIVICFIX FRONTEND PRODUCTION BUILD & BUNDLE ANALYSIS");
  console.log("================================================================================");

  const distDir = path.join(__dirname, '..', '..', 'dist', 'assets');
  if (!fs.existsSync(distDir)) {
    console.warn("dist/assets does not exist. Run 'npm run build' first.");
    return null;
  }

  const files = fs.readdirSync(distDir);
  const chunks = [];

  let totalJsSize = 0;
  let totalCssSize = 0;

  for (const f of files) {
    const filePath = path.join(distDir, f);
    const stats = fs.statSync(filePath);
    const sizeKb = Math.round((stats.size / 1024) * 100) / 100;
    const isJs = f.endsWith('.js');
    const isCss = f.endsWith('.css');

    if (isJs) totalJsSize += stats.size;
    if (isCss) totalCssSize += stats.size;

    chunks.push({
      fileName: f,
      sizeKb,
      type: isJs ? 'JS' : (isCss ? 'CSS' : 'OTHER')
    });
  }

  chunks.sort((a, b) => b.sizeKb - a.sizeKb);

  const top10Largest = chunks.slice(0, 10);
  const totalBuildSizeMb = Math.round(((totalJsSize + totalCssSize) / (1024 * 1024)) * 100) / 100;

  console.log(`\nTotal Production Build Assets: ${chunks.length} files`);
  console.log(`Total JavaScript Bundle Size: ${Math.round((totalJsSize / (1024 * 1024)) * 100) / 100} MB`);
  console.log(`Total CSS Bundle Size: ${Math.round((totalCssSize / 1024) * 100) / 100} KB`);
  console.log(`Combined Total Size: ${totalBuildSizeMb} MB`);

  console.log("\nTop 10 Largest Asset Chunks:");
  top10Largest.forEach((c, idx) => {
    console.log(`  ${(idx + 1).toString().padStart(2)}. [${c.type.padEnd(3)}] ${c.fileName.padEnd(45)}: ${c.sizeKb} KB`);
  });

  // Observations & lazy-loading assessment
  const isCodeSplit = chunks.filter(c => c.type === 'JS').length > 15;
  console.log(`\nCode Splitting Status: ${isCodeSplit ? '✓ Effective Route-Level Code Splitting Active' : '⚠ Monolithic Bundle'}`);

  return {
    totalFiles: chunks.length,
    totalJsSizeMb: Math.round((totalJsSize / (1024 * 1024)) * 100) / 100,
    totalCssSizeKb: Math.round((totalCssSize / 1024) * 100) / 100,
    combinedSizeMb: totalBuildSizeMb,
    top10Largest,
    isCodeSplit
  };
}

if (require.main === module) {
  analyzeFrontendPerformance();
}

module.exports = { analyzeFrontendPerformance };
