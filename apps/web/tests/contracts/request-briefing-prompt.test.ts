import assert from "node:assert/strict";
import {
  requestBriefingPrompt,
  systemPrompt,
} from "@/lib/ai/prompts";

const prompt = requestBriefingPrompt.toLowerCase();

for (const required of [
  "seeking.actorkinds",
  "seeking.supplykinds",
  "brief.outputkinds",
  "execution kind",
  "lead role",
  "role slots",
  "match candidates",
  "provider-only agents",
  "service routing context",
  "route-facing starter defaults",
  "servicefamilykey",
  "serviceplankey",
  "serviceattachmentmode",
  "request_starter_no_supply_attached",
  "requireshumanpresence",
  "requireslocalaccess",
  "field_inspection",
  "field_verification",
  "local_runner",
  "pickup_dropoff",
  "human_service",
  "video_generation",
]) {
  assert.match(prompt, new RegExp(escapeRegExp(required)));
}

assert.match(
  prompt,
  /do not tag human-required photo capture, onsite filming, delivery proof, or verification evidence as provider-only/
);
assert.match(prompt, /qualification tags are scanner filters only/);
assert.match(prompt, /not buyer-authored scope or assignment truth/);
assert.match(
  prompt,
  /copy only explicit canon values into structured fields/
);
assert.match(
  prompt,
  /keep worker and `supply` attachment pending/
);
assert.match(prompt, /human editorial polish/);
assert.match(prompt, /provider-only video agents skip/);

const preDraftPrompt = systemPrompt({
  requestHints: {
    latitude: "14.5995",
    longitude: "120.9842",
    city: "Manila",
    country: "Philippines",
  },
  requestMode: true,
  requestPromptOptimizerEnabled: true,
  supportsTools: true,
}).toLowerCase();

assert.match(preDraftPrompt, /scanner qualification tags/);
assert.match(preDraftPrompt, /provider-only generated media/);
assert.match(preDraftPrompt, /not field evidence/);
assert.match(preDraftPrompt, /human or field-capable/);
assert.match(preDraftPrompt, /service routing context/);
assert.match(preDraftPrompt, /route-facing starter defaults/);
assert.match(preDraftPrompt, /not treat it as worker assignment or proof/);

console.log("Request briefing prompt scanner-tag contract passed.");

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
