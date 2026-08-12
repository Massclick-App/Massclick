/**
 * ULID generation on `node:crypto` — no new dependency.
 *
 * Step 1.2 of the S3 key restructure. See S3_KEY_RESTRUCTURE_PROGRESS.md.
 *
 * WHY NOT `Date.now()`, WHICH IS WHAT THE CODEBASE USES TODAY
 *
 * 31 of the 32 upload paths name their object `…-${Date.now()}`. Two uploads in the
 * same millisecond produce the SAME key and one silently overwrites the other. That is
 * not hypothetical for bulk paths: `businessList/gallery/image-${Date.now()}-${i}`
 * only avoids it because of the trailing index.
 *
 * A ULID is 26 characters: 48 bits of millisecond timestamp followed by 80 bits of
 * randomness, both in Crockford base32. Two useful properties for object keys:
 *
 *   - lexicographically sortable, so `aws s3 ls` lists chronologically
 *   - case-insensitive alphabet with I, L, O and U removed, so a key read off a
 *     printed page or a support ticket cannot be mistranscribed into a different one
 *
 * MONOTONIC WITHIN A PROCESS: two calls in the same millisecond increment the random
 * component rather than re-rolling it, so ordering is stable and collision within a
 * millisecond is impossible in-process. Across processes, 80 random bits makes it
 * vanishingly unlikely.
 *
 * `crypto.randomUUID()` is already used at helper/massclickEvent/massclickEventHelper.js:45,
 * so `node:crypto` is established here; this just needs a sortable, shorter, filename-safe id.
 */
import { randomBytes } from "node:crypto";

/** Crockford base32 — no I, L, O or U, so it cannot be mistranscribed into another id. */
const ENCODING = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const TIME_LEN = 10;
const RANDOM_LEN = 16;

/** Largest timestamp a 10-character base32 string can hold: 2^48-1 ms ≈ year 10889. */
export const MAX_ULID_TIME = 281474976710655;

let lastTime = -1;
let lastRandom = [];

/**
 * Encode milliseconds as the 10-character time prefix.
 *
 * Exported so the encoding can be asserted directly. `ulid(seedTime)` cannot be used
 * for that: it deliberately routes a backwards-going seed through the monotonic guard,
 * so `ulid(0)` after any earlier call returns the LAST timestamp, not zero. That is
 * correct behaviour for id generation and wrong behaviour for testing the encoder.
 */
export const encodeUlidTime = (time) => {
  if (!Number.isFinite(time) || time < 0 || time > MAX_ULID_TIME) {
    throw new Error(`ulid: timestamp out of range: ${time}`);
  }
  let out = "";
  let remaining = time;
  for (let i = TIME_LEN - 1; i >= 0; i -= 1) {
    out = ENCODING[remaining % 32] + out;
    remaining = Math.floor(remaining / 32);
  }
  return out;
};

/** 16 base32 characters, each carrying 5 bits, drawn from a CSPRNG. */
const randomChars = () => {
  const bytes = randomBytes(RANDOM_LEN);
  const chars = new Array(RANDOM_LEN);
  for (let i = 0; i < RANDOM_LEN; i += 1) chars[i] = bytes[i] % 32;
  return chars;
};

/**
 * Increment the random component in place, for a second call inside the same
 * millisecond. Carries from the least significant character upward; if every
 * character is already at max (odds ~2^-80) it rerolls rather than wrapping to a
 * value lower than the previous one, which would break sort order.
 */
const incrementRandom = (chars) => {
  for (let i = chars.length - 1; i >= 0; i -= 1) {
    if (chars[i] < 31) {
      chars[i] += 1;
      return chars;
    }
    chars[i] = 0;
  }
  return randomChars();
};

/**
 * A 26-character ULID. Monotonic within this process.
 *
 * @param {number} [seedTime] override the clock — for tests only.
 */
export const ulid = (seedTime) => {
  const time = seedTime === undefined ? Date.now() : seedTime;

  if (time === lastTime) {
    lastRandom = incrementRandom(lastRandom);
  } else {
    // A clock that steps backwards (NTP correction) must not produce ids that sort
    // before ones already issued, so treat it as the same millisecond and increment.
    if (time < lastTime && lastTime !== -1) {
      lastRandom = incrementRandom(lastRandom);
      return encodeUlidTime(lastTime) + lastRandom.map((c) => ENCODING[c]).join("");
    }
    lastTime = time;
    lastRandom = randomChars();
  }

  return encodeUlidTime(lastTime) + lastRandom.map((c) => ENCODING[c]).join("");
};

/** Exactly 26 Crockford base32 characters. */
export const ULID_RE = /^[0-9A-HJKMNP-TV-Z]{26}$/;

export const isUlid = (value) => typeof value === "string" && ULID_RE.test(value);

/** Milliseconds encoded in a ULID's first 10 characters, or null if malformed. */
export const ulidTime = (value) => {
  if (!isUlid(value)) return null;
  let time = 0;
  for (const ch of value.slice(0, TIME_LEN)) {
    const digit = ENCODING.indexOf(ch);
    if (digit === -1) return null;
    time = time * 32 + digit;
  }
  return time;
};

export default ulid;
