const fs = require('fs');
const path = require('path');

const LOCALES_DIR = path.join(__dirname, '..', 'src', 'lib', 'i18n', 'locales');
const enPath = path.join(LOCALES_DIR, 'en.json');

if (!fs.existsSync(enPath)) {
  console.error("❌ Master en.json not found!");
  process.exit(1);
}

const enDict = JSON.parse(fs.readFileSync(enPath, 'utf8'));

function getAllKeys(obj, prefix = '') {
  let keys = [];
  for (const [k, v] of Object.entries(obj)) {
    const currentPath = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      keys = keys.concat(getAllKeys(v, currentPath));
    } else {
      keys.push(currentPath);
    }
  }
  return keys;
}

const enKeys = new Set(getAllKeys(enDict));
console.log(`\n🔍 Found ${enKeys.size} translation keys in master en.json.\n`);

const ALL_LANG_CODES = [
  "en", "hi", "mr", "bn", "gu", "pa", "ta", "te", "kn", "ml",
  "or", "as", "ur", "sa", "ne", "kok", "ks", "sd", "mai", "mni"
];

let hasErrors = false;

for (const lang of ALL_LANG_CODES) {
  const filePath = path.join(LOCALES_DIR, `${lang}.json`);
  if (!fs.existsSync(filePath)) {
    console.error(`❌ [${lang}] File missing: ${lang}.json`);
    hasErrors = true;
    continue;
  }

  try {
    const dict = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const langKeys = new Set(getAllKeys(dict));

    const missing = [];
    for (const key of enKeys) {
      if (!langKeys.has(key)) {
        missing.push(key);
      }
    }

    const extra = [];
    for (const key of langKeys) {
      if (!enKeys.has(key)) {
        extra.push(key);
      }
    }

    if (missing.length > 0 || extra.length > 0) {
      hasErrors = true;
      console.error(`❌ [${lang}] Parity mismatch: ${missing.length} missing, ${extra.length} extra.`);
      if (missing.length > 0) console.error(`   Missing: ${missing.slice(0, 5).join(', ')}${missing.length > 5 ? '...' : ''}`);
      if (extra.length > 0) console.error(`   Extra: ${extra.slice(0, 5).join(', ')}${extra.length > 5 ? '...' : ''}`);
    } else {
      console.log(`✅ [${lang.padEnd(4)}] 100% key parity (${langKeys.size}/${enKeys.size} keys verified)`);
    }
  } catch (err) {
    hasErrors = true;
    console.error(`❌ [${lang}] JSON parse error: ${err.message}`);
  }
}

if (hasErrors) {
  console.error("\n❌ Locale validation failed with errors.\n");
  process.exit(1);
} else {
  console.log("\n🎉 All 20 Indic locale files validated with 100% complete key parity!\n");
  process.exit(0);
}
