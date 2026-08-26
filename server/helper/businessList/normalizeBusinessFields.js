// Field-level cleaning applied to every business write, so the database never
// receives the placeholder and punctuation noise that made stored addresses
// unusable. This is the last line of defence: the admin form cleans on blur,
// but the API is also reached by bulk imports, the publicize flow and the
// owner-facing edit page, none of which go through that form.
//
// The rules mirror `normalizeAddressField` and `formatExperience` in
// client/ui-app/src/utils/formatBusinessAddress.js, which is the canonical
// definition and carries the test suite. Only the field-level rules live here;
// the display composition is a UI concern and is not duplicated. Keep the two
// in step — a value cleaned here must equal the same value cleaned there.

// Placeholders that mean "nothing was entered". They reach the API from
// operators typing a dash and from an admin-grid round-trip that wrote its own
// "-" display placeholder back into the record.
const JUNK_VALUES = new Set([
  "",
  "-",
  "--",
  "---",
  ".",
  ",",
  "n/a",
  "na",
  "nil",
  "none",
  "null",
  "undefined",
]);

const isJunk = (value) => JUNK_VALUES.has(String(value ?? "").trim().toLowerCase());

export const normalizeAddressField = (value) => {
  if (value === undefined || value === null) return value;
  if (typeof value !== "string") return value;

  const tidied = value
    .replace(/\s+/g, " ")
    .replace(/\s*,\s*/g, ", ")
    .replace(/(?:,\s*)+/g, ", ")
    .replace(/^[\s,.-]+/, "")
    .replace(/[\s,.-]+$/, "")
    .trim();

  return isJunk(tidied) ? "" : tidied;
};

export const normalizeExperience = (value) => {
  if (value === undefined || value === null) return value;

  const raw = String(value).trim();
  if (!raw || isJunk(raw)) return "";

  const match = raw.match(/\d+/);
  if (!match) return "";

  const years = Number.parseInt(match[0], 10);
  // Above this the value is a phone number or a founding year ("2015"), not a
  // duration. The bound is 200 rather than 100 because genuinely old businesses
  // are in the data — a Bosch store at 140 years and a post office at 150.
  if (!Number.isFinite(years) || years <= 0 || years > 200) return "";

  return String(years);
};

const ADDRESS_TEXT_FIELDS = [
  "plotNumber",
  "street",
  "globalAddress",
  "location",
  "email",
  "contactList",
  "gstin",
  "googleMap",
  "website",
  "facebook",
  "instagram",
  "youtube",
  "pinterest",
  "twitter",
  "linkedin",
  "businessDetails",
];

/**
 * Clean the free-text fields of an incoming create/update payload in place.
 *
 * Only fields actually present on the payload are touched — a partial update
 * must not resurrect a field the caller did not send. `pincode` is reduced to
 * its digits but deliberately not rejected when it is the wrong length: that
 * is the validator's call, and silently dropping an operator's typo would hide
 * the mistake rather than surface it.
 */
export const normalizeBusinessWritePayload = (payload = {}) => {
  if (!payload || typeof payload !== "object") return payload;

  for (const field of ADDRESS_TEXT_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(payload, field)) {
      payload[field] = normalizeAddressField(payload[field]);
    }
  }

  if (Object.prototype.hasOwnProperty.call(payload, "experience")) {
    payload.experience = normalizeExperience(payload.experience);
  }

  if (
    Object.prototype.hasOwnProperty.call(payload, "pincode") &&
    typeof payload.pincode === "string"
  ) {
    const digits = payload.pincode.replace(/\D/g, "");
    payload.pincode = digits.length === 6 ? digits : normalizeAddressField(payload.pincode);
  }

  return payload;
};
