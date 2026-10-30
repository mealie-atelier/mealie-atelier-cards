// Shared constants of the end-to-end suite. Everything here is fictional and local to the disposable stack.
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

export const E2E_DIR = join(dirname(fileURLToPath(import.meta.url)), "..");
export const WEB_DIR = join(E2E_DIR, "..", "..");
export const route = process.env.E2E_ROUTE || "node";
export const baseUrl = process.env.E2E_BASE_URL || "";
export const mealieUrl = process.env.E2E_MEALIE_URL || "";
export const mealieToken = process.env.E2E_MEALIE_TOKEN || "";

/** Accounts of the primary app under test. Passwords are throwaway values for the disposable stack. */
export const ACCOUNTS = {
  shared: { name: "atelier", password: "e2e-shared-passphrase", role: "admin" },
  admin: { name: "ana", password: "e2e-admin-passphrase", role: "admin" },
  writer: { name: "wim", password: "e2e-writer-passphrase", role: "writer" },
  reader: { name: "rita", password: "e2e-reader-passphrase", role: "reader" },
};

export const VIEWPORTS = {
  phone: { width: 390, height: 844 },
  tablet: { width: 820, height: 1180 },
  desktop: { width: 1440, height: 900 },
};

export const basicHeader = ({ name, password }) =>
  "Basic " + Buffer.from(`${name}:${password}`).toString("base64");
