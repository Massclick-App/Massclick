// Mirrors normalizeWhatsAppMobile in server/helper/msg91/whatsappReliabilityHelper.js, so a
// number accepted here is one the server can actually send a WhatsApp message to.
// Returns the 10-digit national number, or "" when the value is not a valid Indian mobile.
export const normalizeIndianMobile = (value) => {
  let digits = String(value ?? "").replace(/\D/g, "");
  if (digits.startsWith("0091")) digits = digits.slice(4);
  if (digits.startsWith("91") && digits.length === 12) digits = digits.slice(2);
  if (digits.startsWith("0") && digits.length === 11) digits = digits.slice(1);
  return /^[6-9]\d{9}$/.test(digits) ? digits : "";
};

export const formatIndianMobile = (value) => {
  const national = normalizeIndianMobile(value);
  return national ? `+91 ${national.slice(0, 5)} ${national.slice(5)}` : String(value ?? "");
};

// For a phone input: keeps digits only and collapses a complete +91 / 0091 / 0-prefixed
// number to 10 digits as soon as it is typed or pasted.
export const toMobileInputValue = (value) => {
  const digits = String(value ?? "").replace(/\D/g, "");
  return normalizeIndianMobile(digits) || digits.slice(0, 12);
};
