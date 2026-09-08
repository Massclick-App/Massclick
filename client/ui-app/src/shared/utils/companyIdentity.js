/**
 * Registered legal identity of the company behind Massclick.
 *
 * Single source of truth for the details that have to be displayed publicly for
 * legal / compliance review (WhatsApp Business API onboarding, payment gateway
 * KYC, app store listings). Everything here is transcribed from the Certificate
 * of Incorporation issued by the MCA Central Registration Centre on
 * 09-Jul-2026, so the site matches the registered record exactly.
 *
 * Do not put PAN or TAN in here — those are on the same certificate but must
 * not be rendered publicly.
 */

export const COMPANY_LEGAL_NAME = "MassClick Technologies Private Limited";

/** Corporate Identity Number, as issued by the MCA. */
export const COMPANY_CIN = "U62090TN2026PTC195081";

/** Official business email, displayed publicly as the contact of record. */
export const COMPANY_EMAIL = "admin@massclick.in";

/** Support number published on the contact page. */
export const COMPANY_PHONE = "+91 97891 04201";

/** WhatsApp business number, digits only, for wa.me links. */
export const COMPANY_WHATSAPP = "917358673203";

/**
 * Registered office, matching the mailing address on the Certificate of
 * Incorporation. Kept as parts so the JSON-LD PostalAddress and the rendered
 * address can never drift apart.
 */
export const COMPANY_ADDRESS = {
  street: "No. 166/9, SLK Complex, Renga Nagar, Mangammal Salai, K.K. Nagar",
  locality: "Tiruchirappalli",
  region: "Tamil Nadu",
  postalCode: "620021",
  country: "India",
  countryCode: "IN",
};

/** Single-line registered address, e.g. for the footer. */
export const COMPANY_ADDRESS_LINE = [
  COMPANY_ADDRESS.street,
  COMPANY_ADDRESS.locality,
  `${COMPANY_ADDRESS.region} ${COMPANY_ADDRESS.postalCode}`,
  COMPANY_ADDRESS.country,
].join(", ");
