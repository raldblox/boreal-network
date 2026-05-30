import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

const repoRoot = process.cwd();
const checks = [];

function read(path) {
  return readFileSync(join(repoRoot, path), "utf8");
}

function fail(message) {
  checks.push({ ok: false, message });
}

function pass(message) {
  checks.push({ ok: true, message });
}

function listMarkdownFiles(path) {
  return readdirSync(join(repoRoot, path), { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => name.endsWith(".md"))
    .sort();
}

function walkFiles(path) {
  return readdirSync(join(repoRoot, path), { withFileTypes: true }).flatMap(
    (entry) => {
      const childPath = join(path, entry.name);
      if (entry.isDirectory()) {
        return walkFiles(childPath);
      }
      return [childPath];
    }
  );
}

const conflictPattern = /^(<<<<<<<|=======|>>>>>>>) /m;
const docsFiles = walkFiles("docs").filter((file) => file.endsWith(".md"));

for (const file of docsFiles) {
  if (conflictPattern.test(read(file))) {
    fail(`${file} contains unresolved merge-conflict markers`);
  }
}

if (!checks.some((check) => !check.ok)) {
  pass("docs markdown has no unresolved merge-conflict markers");
}

function assertListed(directory, readmePath) {
  const readme = read(readmePath);
  const files = listMarkdownFiles(directory).filter((name) => name !== "README.md");
  for (const file of files) {
    if (!readme.includes(file)) {
      fail(
        `${relative(repoRoot, join(repoRoot, directory, file))} is missing from ${readmePath}`
      );
    }
  }
  pass(`${readmePath} lists every markdown file in ${directory}`);
}

assertListed("docs/decisions", "docs/decisions/README.md");
assertListed("docs/strategy", "docs/strategy/README.md");

const decisionsReadme = read("docs/decisions/README.md");
const strategyReadme = read("docs/strategy/README.md");

if (!decisionsReadme.includes("## State Register")) {
  fail("docs/decisions/README.md is missing a State Register section");
}

if (!strategyReadme.includes("## State Register")) {
  fail("docs/strategy/README.md is missing a State Register section");
}

const docsReadme = read("docs/README.md");
const docsIndex = read("docs/INDEX.md");
const requiredNavigationTargets = [
  "DOC_LIFECYCLE.md",
  "strategy/SELF_SERVE_MARKETPLACE_LAUNCH_PLAN.md",
  "strategy/PUBLIC_PILOT_SMOKE_TEST_CHECKLIST.md",
];

for (const target of requiredNavigationTargets) {
  if (!docsReadme.includes(target)) {
    fail(`docs/README.md does not link ${target}`);
  }
  if (!docsIndex.includes(target)) {
    fail(`docs/INDEX.md does not link ${target}`);
  }
}

if (!checks.some((check) => !check.ok)) {
  pass("docs lifecycle navigation is complete");
}

for (const check of checks) {
  console.log(`${check.ok ? "PASS" : "FAIL"} ${check.message}`);
}

if (checks.some((check) => !check.ok)) {
  process.exitCode = 1;
}
