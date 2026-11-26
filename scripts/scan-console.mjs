// Fails if any direct `console.*` call exists in app source.
// The single sanctioned logging seam is the logger (allowlisted below).
//
// Scope: only `src/` is scanned. Excluded, by design:
//   - **/generated/**            — generated OpenAPI types (never hand-edited)
//   - **/__tests__/**, *.test.*, *.spec.*  — test code
//   - the logger                 — the one allowed console site
//
// Comment handling: block comments and `//` line comments are stripped before
// matching, so commented-out console lines are ignored.

import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();

// Directories that contain scannable app source.
const SOURCE_DIRS = ["src"];

// Individual root-level source files to include (not under a scanned dir).
const SOURCE_ROOT_FILES = [];

// Path (POSIX, repo-relative) of the one allowed console site.
const LOGGER_PATH = "src/lib/logger.ts";
const ALLOWLIST = new Set([LOGGER_PATH]);
const SOURCE_EXT = new Set([".ts", ".tsx"]);

function isExcludedFile(relPosix) {
  if (ALLOWLIST.has(relPosix)) return true;
  if (relPosix.includes("/generated/")) return true;
  if (relPosix.includes("/__tests__/")) return true;
  if (/\.(test|spec)\.(ts|tsx)$/.test(relPosix)) return true;
  return false;
}

function walk(absDir, out) {
  for (const entry of fs.readdirSync(absDir, { withFileTypes: true })) {
    if (entry.name === "node_modules") continue;
    const abs = path.join(absDir, entry.name);
    if (entry.isDirectory()) {
      walk(abs, out);
    } else if (SOURCE_EXT.has(path.extname(entry.name))) {
      out.push(abs);
    }
  }
}

function stripComments(source) {
  let out = "";
  let i = 0;
  let state = "code"; // "code" | "line" | "block"
  while (i < source.length) {
    const two = source.slice(i, i + 2);
    if (state === "code") {
      if (two === "//") { state = "line"; i += 2; continue; }
      if (two === "/*") { state = "block"; i += 2; continue; }
      out += source[i]; i += 1;
    } else if (state === "line") {
      if (source[i] === "\n") { state = "code"; out += "\n"; }
      i += 1;
    } else { // block
      if (two === "*/") { state = "code"; i += 2; continue; }
      out += source[i] === "\n" ? "\n" : " ";
      i += 1;
    }
  }
  return out;
}

const files = [];
for (const dir of SOURCE_DIRS) {
  const abs = path.join(repoRoot, dir);
  if (fs.existsSync(abs)) walk(abs, files);
}
for (const rel of SOURCE_ROOT_FILES) {
  const abs = path.join(repoRoot, rel);
  if (fs.existsSync(abs)) files.push(abs);
}

const CONSOLE_RE = /\bconsole\s*\.\s*[a-zA-Z]+/;
const violations = [];

for (const abs of files) {
  const relPosix = path.relative(repoRoot, abs).split(path.sep).join("/");
  if (isExcludedFile(relPosix)) continue;

  const stripped = stripComments(fs.readFileSync(abs, "utf8"));
  const lines = stripped.split("\n");
  for (let n = 0; n < lines.length; n += 1) {
    if (CONSOLE_RE.test(lines[n])) {
      violations.push({ file: relPosix, line: n + 1, text: lines[n].trim() });
    }
  }
}

if (violations.length > 0) {
  console.error(
    `Found ${violations.length} direct console.* call(s) outside ${LOGGER_PATH}.\n` +
      `Route logging through ${LOGGER_PATH} (logger.debug/info/warn/error).\n`
  );
  for (const v of violations) {
    console.error(`  ${v.file}:${v.line}  ${v.text}`);
  }
  process.exit(1);
}

console.log(`scan-console: OK, no direct console.* outside ${LOGGER_PATH}.`);
