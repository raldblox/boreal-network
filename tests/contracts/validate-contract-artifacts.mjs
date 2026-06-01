import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");

function filesIn(dir, suffix) {
  return readdirSync(join(repoRoot, dir))
    .filter((name) => name.endsWith(suffix))
    .sort()
    .map((name) => join(dir, name));
}

function readText(path) {
  return readFileSync(join(repoRoot, path), "utf8").replace(/^\uFEFF/, "");
}

function parseJson(path) {
  try {
    return JSON.parse(readText(path));
  } catch (error) {
    throw new Error(`${path} is not valid JSON: ${error.message}`);
  }
}

const jsonSchemas = filesIn("schemas/json", ".json");
assert.ok(jsonSchemas.length > 0, "expected canonical JSON Schema files");

for (const path of jsonSchemas) {
  const schema = parseJson(path);
  assert.equal(
    schema.$schema,
    "https://json-schema.org/draft/2020-12/schema",
    `${path} must declare draft 2020-12 JSON Schema`
  );
  assert.equal(typeof schema.title, "string", `${path} must have a title`);
  assert.ok(schema.title.length > 0, `${path} title must not be empty`);
  assert.ok(
    schema.type || schema.$defs,
    `${path} must define a root type or reusable $defs`
  );
}

const fixtureJson = [
  ...filesIn("fixtures/agent", ".json"),
  ...filesIn("fixtures/request", ".json"),
  ...filesIn("fixtures/supply", ".json"),
  ...filesIn("fixtures/fulfillment", ".json"),
  ...filesIn("fixtures/problem-intel", ".json"),
];

for (const path of fixtureJson) {
  parseJson(path);
}

const openapiFiles = filesIn("schemas/openapi", ".yaml");
assert.ok(openapiFiles.length > 0, "expected OpenAPI contract files");

for (const path of openapiFiles) {
  const text = readText(path);
  assert.match(text, /^openapi:\s*3\.(?:0|1)\.\d+/m, `${path} must declare OpenAPI 3.x`);
  assert.match(text, /^info:\s*$/m, `${path} must define info`);
  assert.match(text, /^\s+title:\s+\S+/m, `${path} must define info.title`);
  assert.match(text, /^\s+version:\s+\S+/m, `${path} must define info.version`);
  assert.match(text, /^paths:\s*$/m, `${path} must define paths`);
  assert.match(text, /^components:\s*$/m, `${path} must define components`);
  assert.doesNotMatch(text, /\t/, `${path} must not use tabs`);
  assert.doesNotMatch(text, /<<<<<<<|=======|>>>>>>>/, `${path} must not contain merge markers`);
}

const asyncapiFiles = filesIn("schemas/events", ".yaml");
assert.ok(asyncapiFiles.length > 0, "expected AsyncAPI event contract files");

for (const path of asyncapiFiles) {
  const text = readText(path);
  assert.match(text, /^asyncapi:\s*\d+\.\d+\.\d+/m, `${path} must declare AsyncAPI version`);
  assert.match(text, /^info:\s*$/m, `${path} must define info`);
  assert.match(text, /^channels:\s*$/m, `${path} must define channels`);
  assert.match(text, /^components:\s*$/m, `${path} must define components`);
  assert.match(text, /RequestEventEnvelope/, `${path} must include request event envelope coverage`);
  assert.doesNotMatch(text, /\t/, `${path} must not use tabs`);
  assert.doesNotMatch(text, /<<<<<<<|=======|>>>>>>>/, `${path} must not contain merge markers`);
}

console.log(
  `Validated ${jsonSchemas.length} JSON Schema file(s), ${fixtureJson.length} fixture JSON file(s), ${openapiFiles.length} OpenAPI file(s), and ${asyncapiFiles.length} AsyncAPI file(s).`
);
