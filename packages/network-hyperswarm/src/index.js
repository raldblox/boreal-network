import { EventEmitter } from "node:events";
import fs from "node:fs/promises";
import path from "node:path";
import Corestore from "corestore";
import Hyperbee from "hyperbee";
import Hyperswarm from "hyperswarm";
import {
  buildControlTopic,
  buildPeerHello,
  buildRequestTopic,
  bufferToHex,
  formatPeerFingerprint,
  getPeerHomePath,
  hexToBuffer,
} from "@boreal/network-core";

export async function startHyperswarmPeerHost({
  appHomePath,
  peerHomePath = getPeerHomePath(appHomePath),
  runtimeIdentity,
} = {}) {
  if (!runtimeIdentity?.seedHex || !runtimeIdentity?.publicKeyHex) {
    throw new Error("A valid Boreal peer runtime identity is required.");
  }

  const events = new EventEmitter();
  const peers = new Map();
  const requestTopics = new Map();
  const controlTopic = buildControlTopic();
  const storePath = path.join(peerHomePath, "store");
  const helloMessage = buildPeerHello(runtimeIdentity, {
    role: "peer-runtime",
  });

  await fs.mkdir(storePath, { recursive: true });

  const store = new Corestore(storePath);
  await store.ready();

  const metadataFeed = store.get({
    name: "peer-metadata",
    valueEncoding: "json",
  });
  const metadata = new Hyperbee(metadataFeed, {
    keyEncoding: "utf-8",
    valueEncoding: "json",
  });
  await metadata.ready();

  const swarm = new Hyperswarm({
    seed: hexToBuffer(runtimeIdentity.seedHex),
  });
  const discoveries = new Map();
  let listeningAt = null;
  let stopped = false;

  function getPeerEntries() {
    return Array.from(peers.values());
  }

  function getState() {
    return {
      controlTopicHex: bufferToHex(controlTopic),
      fingerprint: runtimeIdentity.fingerprint,
      listeningAt,
      peerCount: peers.size,
      peerHomePath,
      peerPublicKeyHex: runtimeIdentity.publicKeyHex,
      requestTopicCount: requestTopics.size,
      requestTopicHexes: Array.from(requestTopics.values()).map(
        (entry) => entry.topicHex,
      ),
      status: stopped ? "stopped" : listeningAt ? "listening" : "starting",
      storePath,
    };
  }

  async function persistSelfRecord(extra = {}) {
    await metadata.put("runtime:self", {
      ...helloMessage,
      ...extra,
      controlTopicHex: bufferToHex(controlTopic),
      listeningAt,
      peerCount: peers.size,
      requestTopicHexes: Array.from(requestTopics.values()).map(
        (entry) => entry.topicHex,
      ),
      status: stopped ? "stopped" : listeningAt ? "listening" : "starting",
      updatedAt: new Date().toISOString(),
    });
  }

  function upsertPeerState(remotePublicKeyHex, nextValue) {
    const mapKey = remotePublicKeyHex || `anonymous:${Date.now()}:${Math.random()}`;
    peers.set(mapKey, nextValue);
    void persistSelfRecord().catch(() => undefined);
    events.emit("peer-state", getState());
    return mapKey;
  }

  swarm.on("connection", (socket, details = {}) => {
    const remotePublicKeyHex = details.publicKey
      ? bufferToHex(details.publicKey)
      : null;
    const mapKey = upsertPeerState(remotePublicKeyHex, {
      client: details.client === true,
      connectedAt: new Date().toISOString(),
      remoteFingerprint: remotePublicKeyHex
        ? formatPeerFingerprint(remotePublicKeyHex)
        : "unknown",
      remotePublicKeyHex,
      server: details.server === true,
    });

    socket.write(`${JSON.stringify(helloMessage)}\n`);

    let buffered = "";
    socket.setEncoding("utf8");
    socket.on("data", (chunk) => {
      buffered += chunk;

      while (buffered.includes("\n")) {
        const newlineIndex = buffered.indexOf("\n");
        const line = buffered.slice(0, newlineIndex).trim();
        buffered = buffered.slice(newlineIndex + 1);

        if (!line) {
          continue;
        }

        try {
          events.emit("peer-message", {
            message: JSON.parse(line),
            remotePublicKeyHex,
          });
        } catch {
          events.emit("peer-message", {
            message: {
              raw: line,
            },
            remotePublicKeyHex,
          });
        }
      }
    });

    socket.on("close", () => {
      peers.delete(mapKey);
      void persistSelfRecord().catch(() => undefined);
      events.emit("peer-state", getState());
    });
  });

  const controlDiscovery = swarm.join(controlTopic, {
    client: true,
    server: true,
  });
  discoveries.set("control", controlDiscovery);
  await controlDiscovery.flushed();
  listeningAt = new Date().toISOString();
  await persistSelfRecord();

  async function joinRequestTopic(requestId) {
    const key = requestId.trim();
    if (!key) {
      throw new Error("Request topic id is required.");
    }

    if (requestTopics.has(key)) {
      return requestTopics.get(key).topicHex;
    }

    const topic = buildRequestTopic(key);
    const discovery = swarm.join(topic, {
      client: true,
      server: true,
    });

    await discovery.flushed();
    const topicHex = bufferToHex(topic);
    requestTopics.set(key, {
      discovery,
      topicHex,
    });
    await persistSelfRecord();
    return topicHex;
  }

  async function leaveRequestTopic(requestId) {
    const existing = requestTopics.get(requestId);
    if (!existing) {
      return false;
    }

    requestTopics.delete(requestId);
    await existing.discovery.destroy();
    await persistSelfRecord();
    return true;
  }

  async function stop() {
    if (stopped) {
      return getState();
    }

    stopped = true;

    for (const entry of requestTopics.values()) {
      await entry.discovery.destroy().catch(() => undefined);
    }
    requestTopics.clear();

    for (const discovery of discoveries.values()) {
      await discovery.destroy().catch(() => undefined);
    }
    discoveries.clear();

    await persistSelfRecord({
      stoppedAt: new Date().toISOString(),
    }).catch(() => undefined);
    await swarm.destroy().catch(() => undefined);
    await metadata.close().catch(() => undefined);
    await store.close().catch(() => undefined);
    events.emit("peer-state", getState());
    return getState();
  }

  return {
    events,
    getPeerEntries,
    getState,
    joinRequestTopic,
    leaveRequestTopic,
    metadata,
    stop,
    swarm,
  };
}
