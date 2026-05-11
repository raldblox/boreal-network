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

export const requestSuggestions = [
  "Draft a product design request for a React dashboard refresh",
  "Turn this rough AI automation idea into a structured request brief",
  "Help me write budget and timing for a website rebuild request",
  "Update this request with missing constraints and deliverables",
];
