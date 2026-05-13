import path from "node:path";
import process from "node:process";
import {
  ensurePeerRuntimeIdentity,
  getBorealAppHomePath,
  getDesktopHomePath,
  getPeerHomePath,
} from "@boreal/network-core";
import { startHyperswarmPeerHost } from "@boreal/network-hyperswarm";

async function main() {
  const runOnce = process.argv.includes("--once");
  const appHomePath = getBorealAppHomePath();
  const desktopHomePath = getDesktopHomePath(appHomePath);
  const peerHomePath = getPeerHomePath(appHomePath);
  const runtimeIdentity = await ensurePeerRuntimeIdentity({
    desktopHomePath,
    runtimeLabel: "Boreal Desktop Peer",
  });

  const host = await startHyperswarmPeerHost({
    appHomePath,
    peerHomePath,
    runtimeIdentity,
  });

  const state = host.getState();
  const summary = {
    ...state,
    appHomePath,
    desktopHomePath,
    peerHomePath,
    runtimeIdentityPath: path.join(desktopHomePath, "peer-runtime.json"),
  };

  if (runOnce) {
    console.log(JSON.stringify(summary, null, 2));
    await host.stop();
    return;
  }

  console.log("[boreal-peer] listening");
  console.log(JSON.stringify(summary, null, 2));

  host.events.on("peer-state", (nextState) => {
    console.log(
      `[boreal-peer] peers=${nextState.peerCount} requestTopics=${nextState.requestTopicCount}`,
    );
  });

  host.events.on("peer-message", ({ message, remotePublicKeyHex }) => {
    console.log(
      `[boreal-peer] message from ${remotePublicKeyHex ?? "unknown"}: ${JSON.stringify(message)}`,
    );
  });

  let shuttingDown = false;
  async function shutdown() {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;
    await host.stop();
    process.exit(0);
  }

  process.on("SIGINT", () => {
    void shutdown();
  });
  process.on("SIGTERM", () => {
    void shutdown();
  });
}

void main().catch((error) => {
  console.error("[boreal-peer] startup failed", error);
  process.exit(1);
});
