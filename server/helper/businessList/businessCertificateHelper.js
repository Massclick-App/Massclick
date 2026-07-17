import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import QRCode from "qrcode";
import {
  deleteObjectByKey,
  getImageDataUrlByKey,
  getSignedUrlByKey,
  uploadImageToS3,
} from "../../s3Uploder.js";
import businessListModel from "../../model/businessList/businessListModel.js";
import { slugify } from "../../slugify.js";

export const CERTIFICATE_TEMPLATE_VERSION = 13;
const CERTIFICATE_FONT_FAMILY = "'Nirmala UI', 'Noto Sans Tamil', Latha, 'Arial Unicode MS', Arial, Helvetica, sans-serif";
const SERIF_FONT_FAMILY = "Georgia, 'Times New Roman', serif";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Kept inside server/ (not client/) so these ship with the backend deploy,
// which packages only the server directory.
const MASSCLICK_LOGO_PATH = path.resolve(__dirname, "../../assets/certificates/massclick-logo.png");
const SIGNATURE_PATH = path.resolve(__dirname, "../../assets/certificates/signature.png");

const escapeXml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const readImageDataUrl = (filePath, label) => {
  try {
    const buffer = fs.readFileSync(filePath);
    return `data:image/png;base64,${buffer.toString("base64")}`;
  } catch (error) {
    console.warn(`Unable to read ${label} for certificate:`, error.message);
    return "";
  }
};

const MASSCLICK_LOGO_DATA_URL = readImageDataUrl(MASSCLICK_LOGO_PATH, "MassClick logo");
const SIGNATURE_DATA_URL = readImageDataUrl(SIGNATURE_PATH, "signature");

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

const getPublicBaseUrl = () =>
  String(process.env.PUBLIC_BASE_URL || "https://massclick.in").replace(/\/+$/, "");

const buildCertificateVerifyUrl = (business = {}) => {
  if (business.businessProfileQrCode?.qrText) {
    return business.businessProfileQrCode.qrText;
  }

  const businessId = getBusinessId(business);
  const locationSlug = slugify(business.location || "business");
  const businessSlug = slugify(
    business.slug || business.businessName || business.name || "profile",
  );

  return `${getPublicBaseUrl()}/business/${locationSlug}/${businessSlug}/${businessId}`;
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
  fontFamily = CERTIFICATE_FONT_FAMILY,
  letterSpacing,
}) =>
  lines
    .map(
      (line, index) =>
        `<text x="${x}" y="${y + index * lineHeight}" text-anchor="middle" font-family="${fontFamily}" font-size="${fontSize}" font-weight="${fontWeight}" fill="${fill}"${letterSpacing ? ` letter-spacing="${letterSpacing}"` : ""}>${escapeXml(line)}</text>`,
    )
    .join("\n  ");

// ---- decorative building blocks --------------------------------------------

const cornerMark = (x, y, hSign, vSign, color) => {
  const len = 30;
  return `
    <path d="M${x} ${y + vSign * len} V${y} H${x + hSign * len}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" opacity="0.55"/>
    <circle cx="${x}" cy="${y}" r="3" fill="${color}" opacity="0.7"/>`;
};

const sealMarkup = (cx, cy, primary, isTrust) => {
  const bumpCount = 32;
  const bumpR = 6;
  const bumpOrbit = 62;
  const bumps = Array.from({ length: bumpCount })
    .map((_, i) => {
      const angle = (i / bumpCount) * Math.PI * 2;
      const x = cx + bumpOrbit * Math.cos(angle);
      const y = cy + bumpOrbit * Math.sin(angle);
      return `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${bumpR}" fill="${primary}"/>`;
    })
    .join("");
  const icon = isTrust
    ? `<path d="M${cx} ${cy - 20} l14.5 5.8 v15.4 c0 11.4 -6.2 19.4 -14.5 23.2 c-8.3 -3.8 -14.5 -11.8 -14.5 -23.2 v-15.4 z" fill="#ffffff"/>
       <circle cx="${cx}" cy="${cy - 2.5}" r="5.8" fill="${primary}"/>
       <path d="M${cx} ${cy + 3.8} v9.4" stroke="${primary}" stroke-width="4.2" stroke-linecap="round"/>`
    : `<path d="M${cx - 13.5} ${cy + 1} l9 9.5 l19 -21" fill="none" stroke="#ffffff" stroke-width="6.4" stroke-linecap="round" stroke-linejoin="round"/>`;

  return `
    ${bumps}
    <circle cx="${cx}" cy="${cy}" r="52" fill="${primary}"/>
    <circle cx="${cx}" cy="${cy}" r="46.5" fill="none" stroke="#f4c95d" stroke-width="1.6" opacity="0.85"/>
    <circle cx="${cx}" cy="${cy}" r="40" fill="#ffffff" opacity="0.14"/>
    ${icon}`;
};

const chipMarkup = (cx, cy, width, label) => {
  const height = 32;
  const x = cx - width / 2;
  const y = cy - height / 2;
  const checkX = x + 20;
  return `
    <rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${height / 2}" fill="#f8fafc" stroke="#e2e8f0"/>
    <circle cx="${checkX}" cy="${cy}" r="9" fill="#1f7a34"/>
    <path d="M${checkX - 4.4} ${cy + 0.2} L${checkX - 1.2} ${cy + 3.4} L${checkX + 4.8} ${cy - 3.6}" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <text x="${checkX + 14}" y="${cy + 5}" font-family="${CERTIFICATE_FONT_FAMILY}" font-size="14" font-weight="700" fill="#1f2937">${escapeXml(label)}</text>`;
};

const watermarkDefs = (primary) => `
    <pattern id="watermarkTile" width="260" height="190" patternUnits="userSpaceOnUse" patternTransform="rotate(-30)">
      <text x="0" y="80" font-family="${SERIF_FONT_FAMILY}" font-size="26" font-weight="700" fill="${primary}" opacity="0.032">MASSCLICK</text>
    </pattern>`;

const SIGNATURE_ASPECT = 849 / 376;

const signatureMarkup = (cx, bottomY, width) => {
  const height = width / SIGNATURE_ASPECT;
  const x = cx - width / 2;
  const y = bottomY - height;

  if (!SIGNATURE_DATA_URL) {
    return `<path d="M${x} ${bottomY - height / 2} c5,-13 11,-13 15,-3 c4,10 8,-15 13,-6 c4,7 7,-11 12,-4 c4,5 6,4 9,-2"
      fill="none" stroke="#1e293b" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" opacity="0.75"/>`;
  }

  return `<image href="${escapeXml(SIGNATURE_DATA_URL)}" x="${x}" y="${y}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid meet"/>`;
};

const qrMarkup = async ({ url, x, y, size, color }) => {
  try {
    const raw = await QRCode.toString(url, {
      type: "svg",
      margin: 1,
      color: { dark: color, light: "#00000000" },
    });
    const viewBoxMatch = raw.match(/viewBox="([^"]+)"/);
    const bodyMatch = raw.match(/<svg[^>]*>([\s\S]*)<\/svg>/);

    if (!viewBoxMatch || !bodyMatch) return "";

    return `<svg x="${x}" y="${y}" width="${size}" height="${size}" viewBox="${viewBoxMatch[1]}">${bodyMatch[1]}</svg>`;
  } catch (error) {
    console.warn("Unable to build certificate QR code:", error.message);
    return "";
  }
};

// ---- main builder ------------------------------------------------------------

const buildCertificateSvg = async (business = {}, type = "verified") => {
  const isTrust = type === "trust";
  const rawBusinessName = business.businessName || business.name || "Business";
  const rawLocation = business.globalAddress || business.location || "Business location verified by MassClick";
  const businessNameLines = splitSvgTextLines(rawBusinessName, 26, 2);
  const locationLines = splitSvgTextLines(rawLocation, 46, 2);
  const accent = "#ff5a1f";
  const trustBlue = "#00095c";
  const primary = isTrust ? trustBlue : accent;
  const soft = isTrust ? "#eef2ff" : "#fff7ed";
  const statusCopy = isTrust
    ? ["has been certified by MassClick as a", "Trusted business partner"]
    : ["has successfully completed MassClick's", "business verification process"];
  const certNo = `MC-${isTrust ? "TRU" : "VER"}-${(getBusinessId(business) || "000000").slice(-6).toUpperCase()}`;
  const issuedDate = formatCertificateDate(business.certificates?.generatedAt || new Date());
  const category = (business.category || "").trim();
  const businessLogoDataUrl = business.logoImageKey
    ? await getImageDataUrlByKey(business.logoImageKey)
    : "";

  // ---- vertical flow cursor: each block advances `cursor` past itself so
  // longer/shorter business names and addresses never overlap the next block.
  const CX = 360;
  let cursor = 96;

  const sealCy = cursor + 62;
  const sealMarkupOut = sealMarkup(CX, sealCy, primary, isTrust);
  cursor = sealCy + 62 + 26;

  const titleY = cursor;
  const titleMarkupOut = `<text x="${CX}" y="${titleY}" text-anchor="middle" font-family="${SERIF_FONT_FAMILY}" font-size="26" font-weight="700" letter-spacing="1.5" fill="#0f172a">CERTIFICATE OF ${isTrust ? "TRUST" : "VERIFICATION"}</text>`;
  cursor += 22;

  const ruleY = cursor;
  const ruleMarkupOut = `
    <line x1="256" y1="${ruleY}" x2="326" y2="${ruleY}" stroke="#e2e8f0" stroke-width="1.2"/>
    <path d="M${CX} ${ruleY - 6} l6 6 l-6 6 l-6 -6 z" fill="${primary}" opacity="0.7"/>
    <line x1="394" y1="${ruleY}" x2="464" y2="${ruleY}" stroke="#e2e8f0" stroke-width="1.2"/>`;
  cursor += 28;

  const certifyY = cursor;
  const certifyMarkupOut = `<text x="${CX}" y="${certifyY}" text-anchor="middle" font-family="${SERIF_FONT_FAMILY}" font-style="italic" font-size="15" fill="#64748b">This is to certify that</text>`;
  cursor += businessLogoDataUrl ? 20 : 44;

  const businessLogoSize = 104;
  const businessLogoInset = 8;
  const businessLogoY = cursor;
  const businessLogoMarkupOut = businessLogoDataUrl
    ? `<circle cx="${CX}" cy="${businessLogoY + businessLogoSize / 2}" r="${businessLogoSize / 2 + 8}" fill="${soft}" opacity="0.9"/>
       <rect x="${CX - businessLogoSize / 2}" y="${businessLogoY}" width="${businessLogoSize}" height="${businessLogoSize}" rx="18" fill="#ffffff" stroke="${primary}" stroke-opacity="0.3" stroke-width="1.5" filter="url(#logoShadow)"/>
       <image href="${escapeXml(businessLogoDataUrl)}" x="${CX - businessLogoSize / 2 + businessLogoInset}" y="${businessLogoY + businessLogoInset}" width="${businessLogoSize - businessLogoInset * 2}" height="${businessLogoSize - businessLogoInset * 2}" preserveAspectRatio="xMidYMid meet"/>`
    : "";
  if (businessLogoDataUrl) {
    cursor = businessLogoY + businessLogoSize + 30;
  }

  const nameLineHeight = 38;
  const nameFontSize = businessNameLines.length > 1 ? 29 : 33;
  const nameY = cursor;
  const nameMarkupOut = textLinesMarkup({
    lines: businessNameLines,
    x: CX,
    y: nameY,
    lineHeight: nameLineHeight,
    fontSize: nameFontSize,
    fontWeight: 800,
    fill: "#0f172a",
  });
  cursor = nameY + (businessNameLines.length - 1) * nameLineHeight + 30;

  const chipWidth = Math.min(300, Math.max(120, category.length * 9 + 50));
  const categoryY = cursor;
  const categoryMarkupOut = category
    ? `<rect x="${CX - chipWidth / 2}" y="${categoryY - 15}" width="${chipWidth}" height="30" rx="15" fill="${soft}"/>
       <text x="${CX}" y="${categoryY + 5}" text-anchor="middle" font-family="${CERTIFICATE_FONT_FAMILY}" font-size="13" font-weight="700" letter-spacing="0.6" fill="${primary}">${escapeXml(category.toUpperCase())}</text>`
    : "";
  cursor += category ? 40 : 6;

  const locationY = cursor;
  const locationMarkupOut = textLinesMarkup({
    lines: locationLines,
    x: CX,
    y: locationY,
    lineHeight: 22,
    fontSize: 16,
    fontWeight: 600,
    fill: "#475569",
  });
  cursor = locationY + (locationLines.length - 1) * 22 + 34;

  const statementY = cursor;
  const statementMarkupOut = statusCopy
    .map(
      (line, i) =>
        `<text x="${CX}" y="${statementY + i * 21}" text-anchor="middle" font-family="${CERTIFICATE_FONT_FAMILY}" font-size="15" fill="#475569">${i === 1 ? `<tspan font-weight="800" fill="${primary}">${escapeXml(line)}</tspan>` : escapeXml(line)}</text>`,
    )
    .join("\n  ");
  cursor = statementY + 21 + 30;

  const starsMarkupOut = (() => {
    if (!isTrust) return "";

    const starPath = (cx, cy, r) => {
      const points = Array.from({ length: 10 }).map((_, i) => {
        const angle = -Math.PI / 2 + (i * Math.PI) / 5;
        const rad = i % 2 === 0 ? r : r * 0.42;
        return `${(cx + rad * Math.cos(angle)).toFixed(1)},${(cy + rad * Math.sin(angle)).toFixed(1)}`;
      });
      return `<polygon points="${points.join(" ")}" fill="#f4b400"/>`;
    };
    const out = Array.from({ length: 5 })
      .map((_, i) => starPath(CX - 88 + i * 44, cursor, 11))
      .join("");
    cursor += 30;
    return out;
  })();

  const dividerY = cursor;
  const dividerMarkupOut = `
    <line x1="150" y1="${dividerY}" x2="326" y2="${dividerY}" stroke="#e2e8f0" stroke-width="1.4"/>
    <path d="M${CX} ${dividerY - 7} l7 7 l-7 7 l-7 -7 z" fill="${primary}" opacity="0.7"/>
    <line x1="394" y1="${dividerY}" x2="570" y2="${dividerY}" stroke="#e2e8f0" stroke-width="1.4"/>`;
  cursor += 40;

  const checksRow1Y = cursor;
  const checksRow2Y = checksRow1Y + 44;
  const checksMarkupOut = `
    ${chipMarkup(220, checksRow1Y, 190, "Business Proof")}
    ${chipMarkup(500, checksRow1Y, 210, "Business Address")}
    ${chipMarkup(220, checksRow2Y, 190, "Mobile Number")}
    ${chipMarkup(500, checksRow2Y, 190, "Email ID")}`;
  cursor = checksRow2Y + 40;

  // Footer sits at a fixed baseline unless content overflows past it, so
  // certificates for short and long business names stay visually consistent.
  const footerRuleY = Math.max(cursor, 726);
  const qrSize = 68;
  const qrTop = footerRuleY + 24;
  const qrSvg = await qrMarkup({
    url: buildCertificateVerifyUrl(business),
    x: 84,
    y: qrTop,
    size: qrSize,
    color: "#111827",
  });
  const logoW = 170;
  const logoH = logoW / (858 / 200);
  const logoTop = footerRuleY + 30;

  const sigCx = 600;
  const sigImageBottomY = footerRuleY + 50;
  const sigLineY = sigImageBottomY + 6;
  const sigLabelY = sigLineY + 15;

  const brandLogoMarkup = MASSCLICK_LOGO_DATA_URL
    ? `<image href="${escapeXml(MASSCLICK_LOGO_DATA_URL)}" x="${CX - logoW / 2}" y="${logoTop}" width="${logoW}" height="${logoH}" preserveAspectRatio="xMidYMid meet"/>`
    : "";

  const footerMarkup = `
    <line x1="60" y1="${footerRuleY}" x2="660" y2="${footerRuleY}" stroke="#e2e8f0" stroke-width="1"/>
    ${qrSvg}
    <text x="${84 + qrSize / 2}" y="${qrTop + qrSize + 17}" text-anchor="middle" font-family="${CERTIFICATE_FONT_FAMILY}" font-size="10" font-weight="700" letter-spacing="0.4" fill="#94a3b8">SCAN TO VERIFY</text>
    ${brandLogoMarkup}
    <text x="${CX}" y="${logoTop + logoH + 16}" text-anchor="middle" font-family="${CERTIFICATE_FONT_FAMILY}" font-size="11" fill="#94a3b8">www.massclick.in</text>
    ${signatureMarkup(sigCx, sigImageBottomY, 112)}
    <line x1="${sigCx - 50}" y1="${sigLineY}" x2="${sigCx + 50}" y2="${sigLineY}" stroke="#94a3b8" stroke-width="1"/>
    <text x="${sigCx}" y="${sigLabelY}" text-anchor="middle" font-family="${CERTIFICATE_FONT_FAMILY}" font-size="10" font-weight="700" letter-spacing="0.4" fill="#94a3b8">AUTHORIZED SIGNATORY</text>
    <text x="${CX}" y="${footerRuleY + 20 + qrSize + 42}" text-anchor="middle" font-family="${CERTIFICATE_FONT_FAMILY}" font-size="10" fill="#cbd5e1">Certificate No. ${certNo}  |  Issued ${issuedDate}</text>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="720" height="960" viewBox="0 0 720 960">
  <defs>
    <filter id="identityShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="18" stdDeviation="24" flood-color="#0f172a" flood-opacity="0.10"/>
    </filter>
    <filter id="logoShadow" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="7" stdDeviation="8" flood-color="#0f172a" flood-opacity="0.16"/>
    </filter>
    <linearGradient id="pageGlow" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="${soft}"/>
      <stop offset="0.42" stop-color="#ffffff"/>
      <stop offset="1" stop-color="#f8fafc"/>
    </linearGradient>
    ${watermarkDefs(primary)}
  </defs>

  <rect width="720" height="960" fill="url(#pageGlow)"/>
  <rect x="32" y="32" width="656" height="896" fill="url(#watermarkTile)"/>
  <rect x="22" y="22" width="676" height="916" rx="6" fill="none" stroke="${primary}" stroke-opacity="0.35" stroke-width="1.6"/>
  <rect x="32" y="32" width="656" height="896" rx="4" fill="none" stroke="#cbd5e1" stroke-width="1"/>
  ${cornerMark(46, 46, 1, 1, primary)}
  ${cornerMark(674, 46, -1, 1, primary)}
  ${cornerMark(46, 914, 1, -1, primary)}
  ${cornerMark(674, 914, -1, -1, primary)}

  <text x="${CX}" y="72" text-anchor="middle" font-family="${CERTIFICATE_FONT_FAMILY}" font-size="12.5" font-weight="700" letter-spacing="3" fill="#64748b">MASSCLICK BUSINESS VERIFICATION</text>
  <line x1="300" y1="86" x2="420" y2="86" stroke="${primary}" stroke-opacity="0.4" stroke-width="1.2"/>

  ${sealMarkupOut}
  ${titleMarkupOut}
  ${ruleMarkupOut}
  ${certifyMarkupOut}
  ${businessLogoMarkupOut}
  ${nameMarkupOut}
  ${categoryMarkupOut}
  ${locationMarkupOut}
  ${statementMarkupOut}
  ${starsMarkupOut}
  ${dividerMarkupOut}
  ${checksMarkupOut}
  ${footerMarkup}
</svg>`;
};

const uploadCertificateImage = async (business = {}, type = "verified") => {
  const businessId = getBusinessId(business);
  const businessSlug = slugifyCertificateValue(
    business.businessName || business.name || businessId,
  );
  const svg = await buildCertificateSvg(business, type);
  // Timestamped key: uploads set a 1-year Cache-Control and certificate URLs
  // are stable public URLs, so overwriting the same key leaves browsers
  // serving the stale cached file. A fresh key per regeneration busts that.
  const uploadResult = await uploadImageToS3(
    Buffer.from(svg, "utf8"),
    `businessList/certificates/${businessId}/${type}-${businessSlug}-${Date.now()}`,
    {
      skipImageConversion: true,
      contentType: "image/svg+xml",
      extension: "svg",
    },
  );

  console.log(`[CertificateRegenerate] Uploaded ${type} certificate SVG: ${uploadResult.key}`);

  return uploadResult.key;
};

const deleteCertificateKeys = async (keys = []) => {
  const skippedKeys = keys.filter(key =>
    key &&
    (typeof key !== "string" || !key.startsWith("businessList/certificates/")),
  );
  const uniqueKeys = [
    ...new Set(
      keys.filter(key =>
        typeof key === "string" &&
        key.startsWith("businessList/certificates/"),
      ),
    ),
  ];
  const deletedKeys = [];
  const failedKeys = [];

  await Promise.all(
    uniqueKeys.map(async (key) => {
      try {
        await deleteObjectByKey(key);
        deletedKeys.push(key);
      } catch (error) {
        failedKeys.push({ key, message: error.message });
        console.warn(`Unable to delete old certificate from S3 (${key}):`, error.message);
      }
    }),
  );

  if (skippedKeys.length) {
    console.warn(
      "[CertificateRegenerate] Skipped non-certificate S3 keys during certificate cleanup:",
      skippedKeys,
    );
  }

  return { deletedKeys, skippedKeys, failedKeys };
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

  // Paid businesses are entitled to verified + trust status; award any
  // missing flags here so regeneration also repairs businesses whose paid
  // flow ran before badges were auto-updated (or whose email step failed).
  if (!business.verification?.isVerified) {
    business.set("verification.isVerified", true);
    business.set("verification.verifiedAt", new Date());
    business.set("verification.verificationType", "AUTO");
  }
  if (!business.badges?.isTrust) {
    business.set("badges.isTrust", true);
  }

  const currentCertificates = business.certificates?.toObject?.() || business.certificates || {};
  const hasVerifiedCertificate =
    !!business.verification?.isVerified || !!currentCertificates.verifiedCertificateKey;
  const hasTrustCertificate =
    !!business.badges?.isTrust || !!currentCertificates.trustCertificateKey;
  const requestedTypes = [
    hasVerifiedCertificate && "verified",
    hasTrustCertificate && "trust",
  ].filter(Boolean);
  const trace = {
    businessId: getBusinessId(business),
    businessName: business.businessName || business.name || "",
    location: business.globalAddress || business.location || "",
    requestedTypes,
    oldVerifiedCertificateKey: currentCertificates.verifiedCertificateKey || "",
    oldTrustCertificateKey: currentCertificates.trustCertificateKey || "",
    kycDocumentsKeyCount: Array.isArray(business.kycDocumentsKey)
      ? business.kycDocumentsKey.length
      : 0,
    kycTouched: false,
    outputContentType: "image/svg+xml",
    fontFamily: CERTIFICATE_FONT_FAMILY,
    templateVersion: CERTIFICATE_TEMPLATE_VERSION,
  };

  if (!hasVerifiedCertificate && !hasTrustCertificate) {
    const error = new Error("No active verified or trust certificate status found for this business.");
    error.statusCode = 400;
    throw error;
  }

  console.log("[CertificateRegenerate] Starting regenerate:", trace);

  const deleteTrace = await deleteCertificateKeys([
    currentCertificates.verifiedCertificateKey,
    currentCertificates.trustCertificateKey,
  ]);
  trace.deletedCertificateKeys = deleteTrace.deletedKeys;
  trace.skippedDeleteKeys = deleteTrace.skippedKeys;
  trace.failedDeleteKeys = deleteTrace.failedKeys;

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

  trace.newVerifiedCertificateKey = nextCertificates.verifiedCertificateKey || "";
  trace.newTrustCertificateKey = nextCertificates.trustCertificateKey || "";
  trace.generatedAt = nextCertificates.generatedAt;

  const result = appendCertificateUrls(business);
  trace.newVerifiedCertificateUrl = result.certificates?.verifiedCertificateUrl || "";
  trace.newTrustCertificateUrl = result.certificates?.trustCertificateUrl || "";
  console.log("[CertificateRegenerate] Completed regenerate:", trace);

  return { business: result, trace };
};
