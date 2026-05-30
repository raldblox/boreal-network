import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const artifactsServer = readFileSync("lib/artifacts/server.ts", "utf8");
const imageServer = readFileSync("artifacts/image/server.ts", "utf8");

assert.ok(
  artifactsServer.includes('artifactKinds = ["text", "code", "image", "sheet"]'),
  "createDocument kind enum should include image"
);
assert.ok(
  artifactsServer.includes("imageDocumentHandler"),
  "image artifacts need a server document handler"
);
assert.ok(
  imageServer.includes("generateImage") && imageServer.includes('kind: "image"'),
  "image handler should generate image artifacts"
);

console.log("Image artifact contract passed.");
