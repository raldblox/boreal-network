import { generateDummyPassword } from "./db/utils";

export const isProductionEnvironment = process.env.NODE_ENV === "production";
export const isDevelopmentEnvironment = process.env.NODE_ENV === "development";
export const isTestEnvironment = Boolean(
  process.env.PLAYWRIGHT_TEST_BASE_URL ||
    process.env.PLAYWRIGHT ||
    process.env.CI_PLAYWRIGHT
);

export const guestRegex = /^guest-[0-9a-f-]+@boreal\.local$/i;

export const DUMMY_PASSWORD = generateDummyPassword();

export const suggestions = [
  "Turn this rough ask into a work request",
  "Help me shape a request that stays trackable",
  "What human steps does this workflow still need?",
  "Help me map proof and delivery",
];

export const newRequestSuggestions = [
  "Help me turn this idea into a serious request",
  "Help me write the first request brief",
  "What outcome should this request promise?",
  "What proof should completion include?",
];

export const requestDraftSuggestions = [
  "Help me tighten the title and brief",
  "Help me add budget, deadline, and proof to this draft",
  "Help me list constraints, handoffs, and deliverables",
  "What is still missing before I open this request?",
];

export const openRequestSuggestions = [
  "Help me post an update on this request",
  "Who else should this request invite next?",
  "What proof is still missing on this request?",
  "What should happen next on this request?",
];
