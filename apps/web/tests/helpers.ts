import { generateId } from "ai";
import { getUnixTime } from "date-fns";

export function generateRandomTestUser() {
  const email = `test-${getUnixTime(new Date())}@playwright.com`;
  const password = generateId();
  const username = `test-${getUnixTime(new Date())}`;

  return {
    email,
    password,
    username,
  };
}

export function generateTestMessage() {
  return `Test message ${Date.now()}`;
}
