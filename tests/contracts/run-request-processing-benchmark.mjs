import path from "node:path";
import {
  ROOT,
  renderBenchmarkMarkdown,
  renderBenchmarkTex,
  runBenchmark,
  writeText
} from "./request-processing-eval-lib.mjs";

function usage() {
  console.log("Usage:");
  console.log("  node tests/contracts/run-request-processing-benchmark.mjs");
  console.log("  node tests/contracts/run-request-processing-benchmark.mjs --write-json <path> --write-markdown <path> --write-tex <path>");
}

const args = process.argv.slice(2);
let writeJsonPath = null;
let writeMarkdownPath = null;
let writeTexPath = null;

for (let index = 0; index < args.length; index += 1) {
  const arg = args[index];
  switch (arg) {
    case "--write-json":
      writeJsonPath = path.resolve(args[index + 1]);
      index += 1;
      break;
    case "--write-markdown":
      writeMarkdownPath = path.resolve(args[index + 1]);
      index += 1;
      break;
    case "--write-tex":
      writeTexPath = path.resolve(args[index + 1]);
      index += 1;
      break;
    case "--help":
      usage();
      process.exit(0);
      break;
    default:
      usage();
      process.exit(1);
  }
}

const summary = runBenchmark();
const jsonText = `${JSON.stringify(summary, null, 2)}\n`;
const markdownText = renderBenchmarkMarkdown(summary);
const texText = renderBenchmarkTex(summary);

if (writeJsonPath) {
  writeText(writeJsonPath, jsonText);
}

if (writeMarkdownPath) {
  writeText(writeMarkdownPath, markdownText);
}

if (writeTexPath) {
  writeText(writeTexPath, texText);
}

console.log(jsonText.trim());

if (writeJsonPath || writeMarkdownPath || writeTexPath) {
  console.log("");
  if (writeJsonPath) {
    console.log(`Wrote JSON: ${path.relative(ROOT, writeJsonPath)}`);
  }
  if (writeMarkdownPath) {
    console.log(`Wrote Markdown: ${path.relative(ROOT, writeMarkdownPath)}`);
  }
  if (writeTexPath) {
    console.log(`Wrote TeX: ${path.relative(ROOT, writeTexPath)}`);
  }
}
