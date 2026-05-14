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
  "Turn this rough ask into a clear request",
  "Match this work to the right person or worker",
  "Draft a proposal for this work",
  "Help me map the delivery steps",
];

export const newRequestSuggestions = [
  "Help me turn this idea into a request",
  "Help me write the first request brief",
  "What should I include in the first request message?",
  "Help me describe the outcome I want",
];

export const requestDraftSuggestions = [
  "Help me tighten the title and brief",
  "Help me add budget and deadline to this draft",
  "Help me list constraints and deliverables",
  "What is still missing before I open this request?",
];

export const openRequestSuggestions = [
  "Help me post an update on this request",
  "Help me revise the budget on this request",
  "Show me recent activity on this request",
  "What should happen next on this request?",
];
