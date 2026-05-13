import { createHash, randomBytes } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import DHT from "hyperdht";

export const BOREAL_PEER_CONTROL_TOPIC_ID = "boreal-runtime-control-v1";

export function getBorealAppHomePath(homeDir = os.homedir()) {
  return path.join(homeDir, ".boreal-work");
}

export function getDesktopHomePath(appHomePath = getBorealAppHomePath()) {
  return path.join(appHomePath, "desktop");
}

export function getPeerHomePath(appHomePath = getBorealAppHomePath()) {
  return path.join(appHomePath, "peer");
}

export function getPeerRuntimeIdentityPath(
  desktopHomePath = getDesktopHomePath(),
) {
  return path.join(desktopHomePath, "peer-runtime.json");
}

export function bufferToHex(value) {
  return Buffer.from(value).toString("hex");
}

export function hexToBuffer(value) {
  return Buffer.from(value, "hex");
}

export function formatPeerFingerprint(publicKeyHex) {
  return publicKeyHex.length > 16
    ? `${publicKeyHex.slice(0, 8)}...${publicKeyHex.slice(-8)}`
    : publicKeyHex;
}

export function buildPeerTopic(label) {
  return createHash("sha256").update(`boreal:${label}`).digest();
}

export function buildControlTopic() {
  return buildPeerTopic(BOREAL_PEER_CONTROL_TOPIC_ID);
}

export function buildRequestTopic(requestId) {
  return buildPeerTopic(`request:${requestId}`);
}

async function readJsonFile(filePath, fallbackValue) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    if (error && typeof error === "object" && error.code === "ENOENT") {
      return fallbackValue;
    }

    throw error;
  }
}

async function writeJsonFile(filePath, value) {
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export async function ensurePeerRuntimeIdentity({
  desktopHomePath = getDesktopHomePath(),
  runtimeLabel = "Boreal Desktop",
} = {}) {
  await fs.mkdir(desktopHomePath, { recursive: true });

  const filePath = getPeerRuntimeIdentityPath(desktopHomePath);
  const parsed = await readJsonFile(filePath, null);
  const normalized = normalizePeerRuntimeIdentity(parsed);

  if (normalized) {
    return normalized;
  }

  const createdAt = new Date().toISOString();
  const seed = randomBytes(32);
  const keyPair = DHT.keyPair(seed);
  const publicKeyHex = bufferToHex(keyPair.publicKey);
  const controlTopicHex = bufferToHex(buildControlTopic());
  const record = {
    controlTopicHex,
    createdAt,
    fingerprint: formatPeerFingerprint(publicKeyHex),
    keyAlgorithm: "ed25519",
    peerReady: true,
    publicKeyHex,
    runtimeLabel,
    seedHex: bufferToHex(seed),
    updatedAt: createdAt,
  };

  await writeJsonFile(filePath, record);
  return record;
}

export function normalizePeerRuntimeIdentity(value) {
  if (!value || typeof value !== "object") {
    return null;
  }

  const seedHex =
    typeof value.seedHex === "string" && value.seedHex.trim().length === 64
      ? value.seedHex.trim().toLowerCase()
      : null;

  if (!seedHex) {
    return null;
  }

  const keyPair = DHT.keyPair(hexToBuffer(seedHex));
  const publicKeyHex = bufferToHex(keyPair.publicKey);

  return {
    controlTopicHex:
      typeof value.controlTopicHex === "string" &&
      value.controlTopicHex.trim().length === 64
        ? value.controlTopicHex.trim().toLowerCase()
        : bufferToHex(buildControlTopic()),
    createdAt:
      typeof value.createdAt === "string" && value.createdAt.trim().length > 0
        ? value.createdAt
        : new Date().toISOString(),
    fingerprint:
      typeof value.fingerprint === "string" && value.fingerprint.trim().length > 0
        ? value.fingerprint.trim()
        : formatPeerFingerprint(publicKeyHex),
    keyAlgorithm: "ed25519",
    peerReady: true,
    publicKeyHex,
    runtimeLabel:
      typeof value.runtimeLabel === "string" && value.runtimeLabel.trim().length > 0
        ? value.runtimeLabel.trim()
        : "Boreal Desktop",
    seedHex,
    updatedAt:
      typeof value.updatedAt === "string" && value.updatedAt.trim().length > 0
        ? value.updatedAt
        : new Date().toISOString(),
  };
}

export function buildPeerHello(runtimeIdentity, extra = {}) {
  return {
    controlTopicHex: runtimeIdentity.controlTopicHex,
    fingerprint: runtimeIdentity.fingerprint,
    occurredAt: new Date().toISOString(),
    peerReady: runtimeIdentity.peerReady === true,
    publicKeyHex: runtimeIdentity.publicKeyHex,
    runtimeLabel: runtimeIdentity.runtimeLabel,
    schemaVersion: 1,
    ...extra,
  };
}
