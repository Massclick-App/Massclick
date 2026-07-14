import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";
import {
  deleteObjectByKey,
  getObjectBufferByKey,
  getSignedUrlByKey,
  uploadImageToS3,
} from "../../s3Uploder.js";
import businessListModel from "../../model/businessList/businessListModel.js";

export const CERTIFICATE_TEMPLATE_VERSION = 8;
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
  const fallbackImageKey = Array.isArray(business.businessImagesKey)
    ? business.businessImagesKey.find(Boolean)
    : "";
  const imageKey = business.logoImageKey || business.bannerImageKey || fallbackImageKey;

  if (!imageKey) {
    return "";
  }

  try {
    const object = await getObjectBufferByKey(imageKey);

    if (!object?.content?.length) {
      return "";
    }

    const pngBuffer = await sharp(object.content)
      .resize(220, 220, {
        fit: "cover",
        position: "center",
      })
      .png()
      .toBuffer();

    return `data:image/png;base64,${pngBuffer.toString("base64")}`;
  } catch (error) {
    console.warn(
      `Unable to prepare certificate business logo from ${imageKey}:`,
      error.message,
    );
    return "";
  }
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

const splitSvgTextLines = (value = "", maxChars = 28, maxLines = 2) => {
  const words = String(value || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const lines = [];

  for (const word of words) {
    if (lines.length === 0) {
      lines.push(word);
      continue;
    }

    const current = lines[lines.length - 1] || "";
    const next = current ? `${current} ${word}` : word;

    if (next.length <= maxChars) {
      lines[lines.length - 1] = next;
    } else if (lines.length < maxLines) {
      lines.push(word);
    } else {
      lines[lines.length - 1] = `${current} ${word}`.trim();
    }
  }

  return lines.length ? lines.slice(0, maxLines) : ["Business"];
};

const textLinesMarkup = ({
  lines,
  x,
  y,
  lineHeight,
  fontSize,
  fontWeight,
  fill,
  fontFamily = "Arial, Helvetica, sans-serif",
}) =>
  lines
    .map(
      (line, index) =>
        `<text x="${x}" y="${y + index * lineHeight}" text-anchor="middle" font-family="${fontFamily}" font-size="${fontSize}" font-weight="${fontWeight}" fill="${fill}">${escapeXml(line)}</text>`,
    )
    .join("\n  ");

const buildLogoMarkup = ({ logoDataUrl, initials, accent, x = 320, y = 238, radius = 50 }) => {
  if (logoDataUrl) {
    return `
      <clipPath id="businessLogoClip">
        <circle cx="${x}" cy="${y}" r="${radius - 8}"/>
      </clipPath>
      <circle cx="${x}" cy="${y}" r="${radius}" fill="#ffffff" stroke="${accent}" stroke-opacity="0.28" stroke-width="1"/>
      <circle cx="${x}" cy="${y}" r="${radius - 3}" fill="#ffffff" stroke="#fed7c4" stroke-width="1"/>
      <image href="${escapeXml(logoDataUrl)}" x="${x - radius + 6}" y="${y - radius + 6}" width="${(radius - 6) * 2}" height="${(radius - 6) * 2}" preserveAspectRatio="xMidYMid slice" clip-path="url(#businessLogoClip)"/>`;
  }

  return `
      <circle cx="${x}" cy="${y}" r="${radius}" fill="#ffffff" stroke="${accent}" stroke-opacity="0.28" stroke-width="1"/>
      <circle cx="${x}" cy="${y}" r="${radius - 8}" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1"/>
      <text x="${x}" y="${y + 14}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="30" font-weight="900" fill="${accent}">${escapeXml(initials)}</text>`;
};

const buildCertificateSvg = async (business = {}, type = "verified") => {
  const isTrust = type === "trust";
  const rawBusinessName = business.businessName || business.name || "Business";
  const rawLocation = business.globalAddress || business.location || "Business location verified by MassClick";
  const businessNameLines = splitSvgTextLines(rawBusinessName, 28, 2);
  const locationLines = splitSvgTextLines(rawLocation, 44, 2);
  const accent = "#ff5a1f";
  const trustBlue = "#00095c";
  const primary = isTrust ? trustBlue : accent;
  const soft = isTrust ? "#eef2ff" : "#fff7ed";
  const detailWord = isTrust ? "trusted" : "verified";
  const statusCopy = isTrust
    ? "has been certified as a trusted member of MassClick"
    : "has been verified by MassClick";
  const logoDataUrl = await resolveBusinessLogoDataUrl(business);
  const businessLogoMarkup = buildLogoMarkup({
    logoDataUrl,
    initials: getBusinessInitials(business.businessName || business.name),
    accent: primary,
    x: 360,
    y: 318,
    radius: 62,
  });
  const brandLogoMarkup = MASSCLICK_LOGO_DATA_URL
    ? `<image href="${escapeXml(MASSCLICK_LOGO_DATA_URL)}" x="252" y="824" width="216" height="62" preserveAspectRatio="xMidYMid meet"/>`
    : "";
  const titleMarkup = textLinesMarkup({
    lines: businessNameLines,
    x: 360,
    y: 422 + (businessNameLines.length > 1 ? 0 : 20),
    lineHeight: 39,
    fontSize: businessNameLines.length > 1 ? 32 : 36,
    fontWeight: 850,
    fill: "#020617",
  });
  const locationMarkup = textLinesMarkup({
    lines: locationLines,
    x: 360,
    y: businessNameLines.length > 1 ? 508 : 494,
    lineHeight: 25,
    fontSize: 18,
    fontWeight: 750,
    fill: "#111827",
  });
  const checkIcon = (x, y) => `
    <circle cx="${x + 10}" cy="${y + 10}" r="10" fill="#1f7a34"/>
    <path d="M${x + 5.2} ${y + 10.4} L${x + 8.8} ${y + 14} L${x + 15.2} ${y + 6.7}" fill="none" stroke="#ffffff" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/>`;
  const verifiedIcon = `
    <path d="M280 96 L294 91 L306 101 L322 100 L329 114 L343 121 L338 137 L343 153 L329 160 L322 174 L306 173 L294 183 L280 178 L266 183 L254 173 L238 174 L231 160 L217 153 L222 137 L217 121 L231 114 L238 100 L254 101 Z" fill="${accent}"/>
    <path d="M275 139 L287 151 L313 121" fill="none" stroke="#ffffff" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>`;
  const trustIcon = `
    <path d="M306 101 h28 a17 17 0 0 1 17 17 v28 a39 39 0 0 1 -27 37 l-4 1.6 l-4 -1.6 a39 39 0 0 1 -27 -37 v-28 a17 17 0 0 1 17 -17 z" fill="#ffffff"/>
    <circle cx="320" cy="134" r="8" fill="${trustBlue}"/>
    <path d="M320 143 v17" stroke="${trustBlue}" stroke-width="6" stroke-linecap="round"/>`;
  const starsMarkup = isTrust
    ? `<text x="360" y="612" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="900" fill="${accent}">&#9733; &#9733; &#9733; &#9733; &#9733;</text>`
    : "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="720" height="960" viewBox="0 0 720 960">
  <defs>
    <filter id="identityShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="18" stdDeviation="24" flood-color="#0f172a" flood-opacity="0.10"/>
    </filter>
    <linearGradient id="pageGlow" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="${soft}"/>
      <stop offset="0.42" stop-color="#ffffff"/>
      <stop offset="1" stop-color="#f8fafc"/>
    </linearGradient>
    <linearGradient id="dividerGlow" x1="0" x2="1">
      <stop offset="0" stop-color="${accent}" stop-opacity="0"/>
      <stop offset="0.5" stop-color="${accent}" stop-opacity="0.58"/>
      <stop offset="1" stop-color="${accent}" stop-opacity="0"/>
    </linearGradient>
  </defs>

  <rect width="720" height="960" fill="url(#pageGlow)"/>
  <circle cx="360" cy="0" r="250" fill="${accent}" opacity="0.10"/>
  <rect x="24" y="24" width="672" height="912" rx="8" fill="none" stroke="${accent}" stroke-opacity="0.30" stroke-width="1.4"/>
  ${isTrust ? `<rect x="24" y="24" width="230" height="8" rx="4" fill="${trustBlue}"/><rect x="466" y="928" width="230" height="8" rx="4" fill="${trustBlue}"/>` : ""}

  ${isTrust
    ? `<text x="360" y="102" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="36" fill="#1f2937">CERTIFICATE OF</text>
  <rect x="224" y="132" width="272" height="68" rx="10" fill="${trustBlue}"/>
  ${trustIcon}
  <text x="384" y="177" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="40" font-weight="850" fill="#ffffff">Trust</text>`
    : `${verifiedIcon}
  <text x="406" y="154" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="58" font-weight="850" fill="${accent}">Verified</text>`}

  <rect x="112" y="238" width="496" height="312" rx="18" fill="#ffffff" fill-opacity="0.88" stroke="#e2e8f0" filter="url(#identityShadow)"/>
  ${businessLogoMarkup}
  ${titleMarkup}
  ${locationMarkup}

  <text x="360" y="574" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="760" fill="#111827">${escapeXml(statusCopy)}</text>
  ${starsMarkup}

  <rect x="140" y="${isTrust ? 650 : 628}" width="440" height="1.4" fill="url(#dividerGlow)"/>

  <text x="360" y="${isTrust ? 710 : 688}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="18" fill="#475569">
    <tspan>Following details of the company have been </tspan>
    <tspan font-weight="850" fill="${accent}">${detailWord}</tspan>
  </text>

  ${checkIcon(158, isTrust ? 748 : 726)}
  <text x="190" y="${isTrust ? 765 : 743}" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="800" fill="#111827">Business Proof</text>
  ${checkIcon(420, isTrust ? 748 : 726)}
  <text x="452" y="${isTrust ? 765 : 743}" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="800" fill="#111827">Business Address</text>
  ${checkIcon(158, isTrust ? 804 : 782)}
  <text x="190" y="${isTrust ? 821 : 799}" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="800" fill="#111827">Mobile Number</text>
  ${checkIcon(420, isTrust ? 804 : 782)}
  <text x="452" y="${isTrust ? 821 : 799}" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="800" fill="#111827">Email ID</text>

  ${brandLogoMarkup}
</svg>`;
};

const buildCertificatePng = async (business = {}, type = "verified") => {
  const svg = await buildCertificateSvg(business, type);

  return sharp(Buffer.from(svg, "utf8"))
    .png()
    .toBuffer();
};

const uploadCertificateImage = async (business = {}, type = "verified") => {
  const businessId = getBusinessId(business);
  const businessSlug = slugifyCertificateValue(
    business.businessName || business.name || businessId,
  );
  const png = await buildCertificatePng(business, type);
  const uploadResult = await uploadImageToS3(
    png,
    `businessList/certificates/${businessId}/${type}-${businessSlug}`,
    {
      skipImageConversion: true,
      contentType: "image/png",
      extension: "png",
    },
  );

  return uploadResult.key;
};

const deleteCertificateKeys = async (keys = []) => {
  const uniqueKeys = [...new Set(keys.filter(Boolean))];

  await Promise.all(
    uniqueKeys.map(async (key) => {
      try {
        await deleteObjectByKey(key);
      } catch (error) {
        console.warn(`Unable to delete old certificate from S3 (${key}):`, error.message);
      }
    }),
  );
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
      nextCertificates.verifiedCertificateKey = await uploadCertificateImage(
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
      nextCertificates.trustCertificateKey = await uploadCertificateImage(
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

export const regenerateBusinessCertificates = async (businessId) => {
  const business = await businessListModel.findById(businessId);

  if (!business) {
    return null;
  }

  if (!business.amountPaid) {
    const error = new Error("Certificates can be regenerated only for paid businesses.");
    error.statusCode = 400;
    throw error;
  }

  const currentCertificates = business.certificates?.toObject?.() || business.certificates || {};
  const hasVerifiedCertificate =
    !!business.verification?.isVerified || !!currentCertificates.verifiedCertificateKey;
  const hasTrustCertificate =
    !!business.badges?.isTrust || !!currentCertificates.trustCertificateKey;

  if (!hasVerifiedCertificate && !hasTrustCertificate) {
    const error = new Error("No active verified or trust certificate status found for this business.");
    error.statusCode = 400;
    throw error;
  }

  await deleteCertificateKeys([
    currentCertificates.verifiedCertificateKey,
    currentCertificates.trustCertificateKey,
  ]);

  const nextCertificates = {
    ...currentCertificates,
    verifiedCertificateKey: "",
    trustCertificateKey: "",
    generatedAt: new Date(),
    templateVersion: CERTIFICATE_TEMPLATE_VERSION,
  };

  if (hasVerifiedCertificate) {
    nextCertificates.verifiedCertificateKey = await uploadCertificateImage(
      business,
      "verified",
    );
  }

  if (hasTrustCertificate) {
    nextCertificates.trustCertificateKey = await uploadCertificateImage(
      business,
      "trust",
    );
  }

  business.certificates = nextCertificates;
  await business.save();

  return appendCertificateUrls(business);
};
