/**
 * Copy for the "player lookup isn't working" states, which have two audiences.
 *
 * Locally the developer owns the key and wants the fix. In production the
 * visitor owns nothing — `.env.local` and "restart the dev server" are
 * instructions they cannot act on, and the deployment's key health isn't their
 * business — so they get the consequence instead.
 *
 * Only key faults need this split. Rate limits and Riot outages read fine to
 * either audience, so they keep the message `riot.ts` threw.
 */

/** `next dev` sets this to "development"; every other command, "production". */
export const IN_DEVELOPMENT = process.env.NODE_ENV === "development";

/** The failures the operator caused and only the operator can fix. */
const KEY_FAULTS = new Set(["NO_API_KEY", "INVALID_API_KEY", "KEY_FORBIDDEN"]);

export function isKeyFault(code: string): boolean {
  return KEY_FAULTS.has(code);
}

/** Shown to visitors in place of any key-fault detail. */
export const KEY_FAULT_NOTICE = {
  heading: "Player lookup is unavailable",
  message:
    "Player lookup is offline while access to Riot's API is restored. Nothing is wrong on your end — champion browsing still works.",
} as const;
