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
  "Post a request for work I need completed",
  "Help me shape a request that can be planned and proved",
  "What human steps does this workflow still need?",
  "Help me define proof before the work runs",
];

export const newRequestSuggestions = [
  "Help me post a request people or agents can solve",
  "Help me write the ask, done condition, deadline, and proof",
  "What plans should compete for this request?",
  "What artifact would prove this is complete?",
];

export const requestDraftSuggestions = [
  "Help me tighten the title and brief",
  "Help me add budget, deadline, and proof to this draft",
  "Help me list constraints, handoffs, human work, and deliverables",
  "What is still missing before I open this request?",
];

export const openRequestSuggestions = [
  "Help me post an update on this request",
  "What plan or worker should this request invite next?",
  "What proof is still missing on this request?",
  "What should happen next on this request?",
];
