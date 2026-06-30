import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  getImageDataUrlByKey,
  getSignedUrlByKey,
  uploadImageToS3,
} from "../../s3Uploder.js";
import businessListModel from "../../model/businessList/businessListModel.js";

const CERTIFICATE_TEMPLATE_VERSION = 3;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MASSCLICK_LOGO_PATH = path.resolve(
  __dirname,
  "../../../client/ui-app/src/assets/mclogo.png",
);

const escapeXml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const getMassclickLogoDataUrl = () => {
  try {
    const logoBuffer = fs.readFileSync(MASSCLICK_LOGO_PATH);
    return `data:image/png;base64,${logoBuffer.toString("base64")}`;
  } catch (error) {
    console.warn("Unable to read MassClick certificate logo:", error.message);
    return "";
  }
};

const MASSCLICK_LOGO_DATA_URL = getMassclickLogoDataUrl();

const slugifyCertificateValue = (value = "") =>
  String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "business";

const formatCertificateDate = (value = new Date()) => {
  const date = new Date(value);
  const safeDate = Number.isNaN(date.getTime()) ? new Date() : date;

  return safeDate.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getBusinessId = (business = {}) =>
  business?._id?.toString?.() || String(business?._id || business?.id || "");

const getBusinessInitials = (businessName = "") => {
  const words = String(businessName || "Business")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  return (
    words
      .slice(0, 2)
      .map((word) => word[0]?.toUpperCase() || "")
      .join("") || "MC"
  );
};

const resolveBusinessLogoDataUrl = async (business = {}) => {
  if (!business.logoImageKey) {
    return "";
  }

  return getImageDataUrlByKey(business.logoImageKey);
};

const appendCertificateUrls = (business = {}) => {
  const result = business?.toObject?.() || business;

  if (result.certificates?.verifiedCertificateKey) {
    result.certificates.verifiedCertificateUrl = getSignedUrlByKey(
      result.certificates.verifiedCertificateKey,
    );
  }

  if (result.certificates?.trustCertificateKey) {
    result.certificates.trustCertificateUrl = getSignedUrlByKey(
      result.certificates.trustCertificateKey,
    );
  }

  return result;
};

const buildLogoMarkup = ({ logoDataUrl, initials, accent }) => {
  if (logoDataUrl) {
    return `
      <clipPath id="businessLogoClip">
        <circle cx="800" cy="472" r="82"/>
      </clipPath>
      <circle cx="800" cy="472" r="92" fill="#ffffff" stroke="${accent}" stroke-width="5"/>
      <circle cx="800" cy="472" r="83" fill="#f8fafc" stroke="#e2e8f0" stroke-width="2"/>
      <image href="${escapeXml(logoDataUrl)}" x="718" y="390" width="164" height="164" preserveAspectRatio="xMidYMid slice" clip-path="url(#businessLogoClip)"/>`;
  }

  return `
      <circle cx="800" cy="472" r="92" fill="#ffffff" stroke="${accent}" stroke-width="5"/>
      <circle cx="800" cy="472" r="78" fill="#f8fafc" stroke="#e2e8f0" stroke-width="2"/>
      <text x="800" y="497" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="58" font-weight="900" fill="${accent}">${escapeXml(initials)}</text>`;
};

const buildCertificateSvg = async (business = {}, type = "verified") => {
  const isTrust = type === "trust";
  const businessName = escapeXml(
    business.businessName || business.name || "Business",
  );
  const category = escapeXml(business.category || "Listed Business");
  const location = escapeXml(business.location || "India");
  const issueDate = escapeXml(formatCertificateDate(new Date()));
  const certificateTitle = isTrust
    ? "Certificate of Trust"
    : "Verified Business Certificate";
  const certificateStatus = isTrust ? "Trusted Business" : "Verified Business";
  const accent = isTrust ? "#0f9f6e" : "#ff6b1a";
  const accentDark = isTrust ? "#065f46" : "#c2410c";
  const accentSoft = isTrust ? "#ecfdf5" : "#fff7ed";
  const certificateId = escapeXml(getBusinessId(business));
  const contact = escapeXml(
    business.contact || business.contactList || "Reviewed",
  );
  const email = escapeXml(business.email || "Reviewed");
  const logoDataUrl = await resolveBusinessLogoDataUrl(business);
  const businessLogoMarkup = buildLogoMarkup({
    logoDataUrl,
    initials: getBusinessInitials(business.businessName || business.name),
    accent,
  });
  const brandLogoMarkup = MASSCLICK_LOGO_DATA_URL
    ? `<image href="${escapeXml(MASSCLICK_LOGO_DATA_URL)}" x="598" y="928" width="404" height="114" preserveAspectRatio="xMidYMid meet"/>`
    : "";
  const copy = isTrust
    ? "This business has received trust status after profile checks and approved business signals."
    : "This business profile has been verified and approved for verified display status.";

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1120" viewBox="0 0 1600 1120">
  <defs>
    <linearGradient id="pageGradient" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#f8fafc"/>
      <stop offset="0.52" stop-color="#ffffff"/>
      <stop offset="1" stop-color="${accentSoft}"/>
    </linearGradient>
    <linearGradient id="accentGradient" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${accent}"/>
      <stop offset="1" stop-color="${accentDark}"/>
    </linearGradient>
    <pattern id="securityPattern" width="96" height="96" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <rect width="96" height="96" fill="transparent"/>
      <path d="M0 48 H96" stroke="${accent}" stroke-width="1" opacity="0.075"/>
      <path d="M48 0 V96" stroke="#0f172a" stroke-width="1" opacity="0.035"/>
    </pattern>
    <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="18" stdDeviation="24" flood-color="#0f172a" flood-opacity="0.14"/>
    </filter>
  </defs>

  <rect width="1600" height="1120" fill="#e5e7eb"/>
  <rect x="54" y="54" width="1492" height="1012" rx="44" fill="url(#pageGradient)" filter="url(#softShadow)"/>
  <rect x="82" y="82" width="1436" height="956" rx="34" fill="#ffffff" stroke="#e2e8f0" stroke-width="2"/>
  <rect x="112" y="112" width="1376" height="896" rx="26" fill="url(#securityPattern)" stroke="url(#accentGradient)" stroke-width="7"/>
  <rect x="148" y="148" width="1304" height="824" rx="20" fill="none" stroke="#cbd5e1" stroke-width="1.5" stroke-dasharray="10 14"/>

  <text x="800" y="228" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="56" font-weight="900" fill="#0f172a">${escapeXml(certificateTitle)}</text>
  <line x1="552" y1="266" x2="1048" y2="266" stroke="url(#accentGradient)" stroke-width="5" stroke-linecap="round"/>
  <rect x="580" y="302" width="440" height="58" rx="29" fill="${accentSoft}" stroke="${accent}" stroke-width="2"/>
  <text x="800" y="340" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="25" font-weight="900" fill="${accentDark}">${escapeXml(certificateStatus)}</text>

  <rect x="280" y="386" width="1040" height="306" rx="30" fill="#ffffff" fill-opacity="0.86" stroke="#e2e8f0" stroke-width="2"/>
  ${businessLogoMarkup}
  <text x="800" y="604" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="62" font-weight="900" fill="#111827">${businessName}</text>
  <text x="800" y="658" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="30" font-weight="800" fill="#475569">${category} | ${location}</text>
  <text x="800" y="746" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="26" font-weight="600" fill="#334155">${escapeXml(copy)}</text>

  <rect x="230" y="790" width="1140" height="112" rx="22" fill="#ffffff" stroke="#e2e8f0"/>
  <g font-family="Arial, Helvetica, sans-serif">
    <text x="360" y="836" text-anchor="middle" font-size="18" font-weight="900" fill="#64748b">CERTIFICATE ID</text>
    <text x="360" y="873" text-anchor="middle" font-size="21" font-weight="800" fill="#0f172a">${certificateId}</text>

    <text x="630" y="836" text-anchor="middle" font-size="18" font-weight="900" fill="#64748b">ISSUED ON</text>
    <text x="630" y="873" text-anchor="middle" font-size="21" font-weight="800" fill="#0f172a">${issueDate}</text>

    <text x="898" y="836" text-anchor="middle" font-size="18" font-weight="900" fill="#64748b">MOBILE</text>
    <text x="898" y="873" text-anchor="middle" font-size="21" font-weight="800" fill="#0f172a">${contact}</text>

    <text x="1180" y="836" text-anchor="middle" font-size="18" font-weight="900" fill="#64748b">EMAIL</text>
    <text x="1180" y="873" text-anchor="middle" font-size="21" font-weight="800" fill="#0f172a">${email}</text>
  </g>

  ${brandLogoMarkup}
</svg>`;
};

const uploadCertificateSvg = async (business = {}, type = "verified") => {
  const businessId = getBusinessId(business);
  const businessSlug = slugifyCertificateValue(
    business.businessName || business.name || businessId,
  );
  const svg = await buildCertificateSvg(business, type);
  const dataUrl = `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`;
  const uploadResult = await uploadImageToS3(
    dataUrl,
    `businessList/certificates/${businessId}/${type}-${businessSlug}`,
    {
      skipImageConversion: true,
      contentType: "image/svg+xml",
      extension: "svg",
    },
  );

  return uploadResult.key;
};

export const ensureBusinessCertificates = async (businessIdOrDoc) => {
  const businessId =
    typeof businessIdOrDoc === "string"
      ? businessIdOrDoc
      : getBusinessId(businessIdOrDoc);

  if (!businessId) {
    return null;
  }

  const business = await businessListModel.findById(businessId);
  if (!business) {
    return null;
  }

  const nextCertificates = {
    ...(business.certificates?.toObject?.() || business.certificates || {}),
  };
  const needsTemplateRefresh =
    Number(nextCertificates.templateVersion || 0) < CERTIFICATE_TEMPLATE_VERSION;
  let changed = false;

  if (business.verification?.isVerified) {
    if (!nextCertificates.verifiedCertificateKey || needsTemplateRefresh) {
      nextCertificates.verifiedCertificateKey = await uploadCertificateSvg(
        business,
        "verified",
      );
      changed = true;
    }
  } else if (nextCertificates.verifiedCertificateKey) {
    nextCertificates.verifiedCertificateKey = "";
    changed = true;
  }

  if (business.badges?.isTrust) {
    if (!nextCertificates.trustCertificateKey || needsTemplateRefresh) {
      nextCertificates.trustCertificateKey = await uploadCertificateSvg(
        business,
        "trust",
      );
      changed = true;
    }
  } else if (nextCertificates.trustCertificateKey) {
    nextCertificates.trustCertificateKey = "";
    changed = true;
  }

  if (!changed) {
    return appendCertificateUrls(business);
  }

  nextCertificates.generatedAt = new Date();
  nextCertificates.templateVersion = CERTIFICATE_TEMPLATE_VERSION;
  business.certificates = nextCertificates;
  await business.save();

  return appendCertificateUrls(business);
};
