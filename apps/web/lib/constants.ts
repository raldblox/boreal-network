import { generateDummyPassword } from "./db/utils";

export const isProductionEnvironment = process.env.NODE_ENV === "production";
export const isDevelopmentEnvironment = process.env.NODE_ENV === "development";
export const isTestEnvironment = Boolean(
  process.env.PLAYWRIGHT_TEST_BASE_URL ||
    process.env.PLAYWRIGHT ||
    process.env.CI_PLAYWRIGHT
);

export const guestRegex = /^guest-\d+$/;

export const DUMMY_PASSWORD = generateDummyPassword();

export const suggestions = [
  "Turn this rough ask into a Boreal request brief",
  "Match this work to the right specialist",
  "Draft a proposal for an automation request",
  "Help me structure the fulfillment checklist",
];

export const newRequestSuggestions = [
  "Help me turn this idea into a request",
  "Help me write the first brief for this request",
  "What details should I include in the first request message?",
  "Help me frame the outcome I want from this request",
];

export const requestDraftSuggestions = [
  "Help me tighten the title and body of this request",
  "Help me add budget and deadline to this draft",
  "Help me list constraints and deliverables for this draft",
  "What is still missing before I open this request?",
];

export const openRequestSuggestions = [
  "Help me post a progress update on this request",
  "Help me increase the budget on this request",
  "Show me recent activity on this request",
  "What should happen next on this request?",
];
