import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";
import {
  getImageDataUrlByKey,
  getSignedUrlByKey,
  uploadImageToS3,
} from "../../s3Uploder.js";
import businessListModel from "../../model/businessList/businessListModel.js";

export const CERTIFICATE_TEMPLATE_VERSION = 5;
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
  const rawLocation = business.location || "India";
  const businessNameLines = splitSvgTextLines(rawBusinessName, 27, 2);
  const locationLines = splitSvgTextLines(rawLocation, 38, 1);
  const accent = "#ff6b1a";
  const trustBlue = "#00095c";
  const detailWord = isTrust ? "trusted" : "verified";
  const statusCopy = isTrust
    ? "has been certified as a trusted member of MassClick"
    : "has been verified by MassClick";
  const logoDataUrl = await resolveBusinessLogoDataUrl(business);
  const businessLogoMarkup = buildLogoMarkup({
    logoDataUrl,
    initials: getBusinessInitials(business.businessName || business.name),
    accent,
    x: 320,
    y: 238,
    radius: 50,
  });
  const brandLogoMarkup = MASSCLICK_LOGO_DATA_URL
    ? `<image href="${escapeXml(MASSCLICK_LOGO_DATA_URL)}" x="220" y="682" width="200" height="56" preserveAspectRatio="xMidYMid meet"/>`
    : "";
  const titleMarkup = textLinesMarkup({
    lines: businessNameLines,
    x: 320,
    y: businessNameLines.length > 1 ? 330 : 342,
    lineHeight: 34,
    fontSize: businessNameLines.length > 1 ? 28 : 30,
    fontWeight: 850,
    fill: "#020617",
  });
  const locationMarkup = textLinesMarkup({
    lines: locationLines,
    x: 320,
    y: businessNameLines.length > 1 ? 398 : 378,
    lineHeight: 22,
    fontSize: 17,
    fontWeight: 800,
    fill: "#020617",
  });
  const checkIcon = (x, y) => `
    <rect x="${x}" y="${y}" width="14" height="14" rx="3" fill="#1f7a34"/>
    <path d="M${x + 3.2} ${y + 7.3} L${x + 6.2} ${y + 10.1} L${x + 11.2} ${y + 4.3}" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;
  const verifiedIcon = `
    <path d="M274 95 L286 91 L296 99 L309 98 L315 110 L327 116 L323 129 L327 142 L315 148 L309 160 L296 159 L286 167 L274 163 L262 167 L252 159 L239 160 L233 148 L221 142 L225 129 L221 116 L233 110 L239 98 L252 99 Z" fill="${accent}"/>
    <path d="M270 130 L280 140 L300 116" fill="none" stroke="#ffffff" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>`;
  const trustIcon = `
    <path d="M243 107 h14 a10 10 0 0 1 10 10 v12 a17 17 0 0 1 -12 16 l-5 2 l-5 -2 a17 17 0 0 1 -12 -16 v-12 a10 10 0 0 1 10 -10 z" fill="#ffffff"/>
    <circle cx="250" cy="124" r="5" fill="${trustBlue}"/>
    <path d="M250 130 v10" stroke="${trustBlue}" stroke-width="4" stroke-linecap="round"/>`;
  const starsMarkup = isTrust
    ? `<text x="320" y="485" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="900" fill="${accent}">&#9733; &#9733; &#9733; &#9733; &#9733;</text>`
    : "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="640" height="780" viewBox="0 0 640 780">
  <defs>
    <pattern id="certificatePatternA" width="48" height="82" patternUnits="userSpaceOnUse">
      <path d="M0 0 L48 0 L48 12 Z" fill="${accent}" opacity="0.045"/>
      <path d="M0 82 L0 70 L48 82 Z" fill="${accent}" opacity="0.045"/>
    </pattern>
    <pattern id="certificatePatternB" width="48" height="82" patternUnits="userSpaceOnUse">
      <path d="M0 0 L0 12 L48 0 Z" fill="#080f55" opacity="0.035"/>
      <path d="M48 82 L0 82 L48 70 Z" fill="#080f55" opacity="0.035"/>
    </pattern>
    <filter id="identityShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="16" stdDeviation="20" flood-color="#0f172a" flood-opacity="0.08"/>
    </filter>
  </defs>

  <rect width="640" height="780" fill="#ffffff"/>
  <rect width="640" height="780" fill="url(#certificatePatternA)"/>
  <rect width="640" height="780" fill="url(#certificatePatternB)"/>
  <rect x="14" y="14" width="612" height="752" fill="none" stroke="${accent}" stroke-width="1"/>
  ${isTrust ? `<rect x="14" y="14" width="180" height="7" rx="4" fill="${trustBlue}"/><rect x="446" y="759" width="180" height="7" rx="4" fill="${trustBlue}"/>` : ""}

  ${isTrust
    ? `<text x="320" y="72" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="33" fill="#1f2937">CERTIFICATE OF</text>
  <rect x="188" y="100" width="264" height="58" rx="8" fill="${trustBlue}"/>
  ${trustIcon}
  <text x="338" y="140" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="36" font-weight="850" fill="#ffffff">Trust</text>`
    : `<g transform="translate(-78 0)">${verifiedIcon}</g>
  <text x="362" y="136" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="46" font-weight="850" fill="${accent}">Verified</text>`}

  <rect x="110" y="182" width="420" height="${businessNameLines.length > 1 ? 238 : 226}" rx="16" fill="#ffffff" fill-opacity="0.92" stroke="#e2e8f0" filter="url(#identityShadow)"/>
  ${businessLogoMarkup}
  ${titleMarkup}
  ${locationMarkup}

  <text x="320" y="448" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="15" font-weight="800" fill="#020617">${escapeXml(statusCopy)}</text>
  ${starsMarkup}

  <line x1="114" y="534" x2="526" y2="534" stroke="${accent}" stroke-opacity="0.45"/>
  <text x="320" y="575" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="16" fill="#475569">
    <tspan>Following details of the company have been </tspan>
    <tspan font-weight="850" fill="${accent}">${detailWord}</tspan>
  </text>

  ${checkIcon(142, 612)}
  <text x="172" y="625" font-family="Arial, Helvetica, sans-serif" font-size="16" font-weight="800" fill="#111827">Business Proof</text>
  ${checkIcon(398, 612)}
  <text x="428" y="625" font-family="Arial, Helvetica, sans-serif" font-size="16" font-weight="800" fill="#111827">Business Address</text>
  ${checkIcon(142, 654)}
  <text x="172" y="667" font-family="Arial, Helvetica, sans-serif" font-size="16" font-weight="800" fill="#111827">Mobile Number</text>
  ${checkIcon(398, 654)}
  <text x="428" y="667" font-family="Arial, Helvetica, sans-serif" font-size="16" font-weight="800" fill="#111827">Email ID</text>

  ${brandLogoMarkup}
</svg>`;
};

const buildCertificatePng = async (business = {}, type = "verified") => {
  const svg = await buildCertificateSvg(business, type);

  return sharp(Buffer.from(svg, "utf8"), { density: 192 })
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
