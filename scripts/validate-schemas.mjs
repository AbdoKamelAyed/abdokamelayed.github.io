import fs from "node:fs/promises";
import path from "node:path";

const DATA_DIR = path.join(process.cwd(), "public", "data");
const SECRET_PATTERNS = [
  /ghp_[A-Za-z0-9]{20,}/,
  /github_pat_[A-Za-z0-9_]{20,}/,
  /gho_[A-Za-z0-9]{20,}/,
  /Bearer\s+[A-Za-z0-9\-._~+/]+=*/i,
];

const REQUIRED_BASE_KEYS = ["id", "createdAt", "updatedAt", "status", "source"];

async function walkJson(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkJson(full)));
    } else if (entry.name.endsWith(".json")) {
      files.push(full);
    }
  }
  return files;
}

function checkRecord(record, fileLabel, seenIds) {
  const problems = [];
  for (const key of REQUIRED_BASE_KEYS) {
    if (record[key] === undefined || record[key] === null || record[key] === "") {
      problems.push(`${fileLabel}: missing base field "${key}"`);
    }
  }
  if (record.id) {
    if (seenIds.has(record.id)) {
      problems.push(`${fileLabel}: duplicate ID "${record.id}"`);
    }
    seenIds.add(record.id);
  }
  return problems;
}

async function main() {
  const files = await walkJson(DATA_DIR);
  const errors = [];
  const globalIds = new Set();

  for (const file of files) {
    const rel = path.relative(process.cwd(), file);
    const raw = await fs.readFile(file, "utf8");

    for (const pat of SECRET_PATTERNS) {
      if (pat.test(raw)) {
        errors.push(`${rel}: potential secret/token pattern detected`);
      }
    }

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      errors.push(`${rel}: invalid JSON (${err.message})`);
      continue;
    }

    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      errors.push(...checkRecord(parsed, rel, globalIds));
      if (Array.isArray(parsed.items)) {
        const localIds = new Set();
        parsed.items.forEach((item, idx) => {
          if (!item || typeof item !== "object") {
            errors.push(`${rel}[items[${idx}]]: expected object`);
            return;
          }
          errors.push(...checkRecord(item, `${rel}[items[${idx}]]`, localIds));
        });
      }
    } else {
      errors.push(`${rel}: root JSON value must be an object`);
    }
  }

  if (errors.length > 0) {
    console.error("Schema validation failed:\n" + errors.map((e) => ` - ${e}`).join("\n"));
    process.exit(1);
  }
  console.log(`Validated ${files.length} JSON file(s) with 0 errors.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
