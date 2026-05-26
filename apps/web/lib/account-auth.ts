export const USERNAME_PATTERN =
  /^[a-zA-Z0-9](?:[a-zA-Z0-9._-]{1,22}[a-zA-Z0-9])?$/;

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function normalizeUsername(username: string) {
  return username.trim().toLowerCase();
}

export function isEmailIdentifier(identifier: string) {
  return identifier.includes("@");
}
