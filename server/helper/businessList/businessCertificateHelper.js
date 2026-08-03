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
import { buildBusinessDetailsUrl, getBusinessId } from "./businessPublicUrlHelper.js";

export const CERTIFICATE_TEMPLATE_VERSION = 14;
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

const buildCertificateVerifyUrl = (business = {}) => {
  if (business.businessProfileQrCode?.qrText) {
    return business.businessProfileQrCode.qrText;
  }

  return buildBusinessDetailsUrl(business);
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

const CERT_NAVY = "#000b33";
const CERT_NAVY_DEEP = "#00051f";
const CERT_GOLD = "#c38a22";
const CERT_GOLD_LIGHT = "#f3d371";
const CERT_CREAM = "#fffdf7";
const CERT_ORANGE = "#ff5a1f";
const CERT_GREEN = "#078c3a";

const watermarkDefs = () => `
    <pattern id="watermarkTile" width="220" height="160" patternUnits="userSpaceOnUse" patternTransform="rotate(-18)">
      <path d="M0 78 C45 54 84 102 130 78 S204 54 250 78" fill="none" stroke="${CERT_GOLD}" stroke-width="0.8" opacity="0.12"/>
    </pattern>`;

const cornerFlourish = (x, y, hSign = 1, vSign = 1) => `
  <g transform="translate(${x} ${y}) scale(${hSign} ${vSign})" fill="none" stroke-linecap="round" stroke-linejoin="round">
    <path d="M0 0 C10 20 35 14 42 -4 C50 -26 22 -30 17 -8" stroke="${CERT_GOLD_LIGHT}" stroke-width="2.4"/>
    <path d="M18 28 C34 3 64 8 78 25" stroke="${CERT_GOLD}" stroke-width="1.5"/>
    <path d="M24 46 C34 24 53 18 71 20" stroke="${CERT_GOLD}" stroke-width="1.2"/>
    <path d="M31 70 C38 45 55 36 82 38" stroke="${CERT_GOLD}" stroke-width="1.2"/>
    <path d="M39 18 C53 16 63 7 69 -8" stroke="${CERT_GOLD_LIGHT}" stroke-width="1.2"/>
    <path d="M45 29 c-7 3 -12 8 -16 16 c10 -2 17 -7 22 -15" fill="${CERT_GOLD}" stroke="none" opacity="0.8"/>
    <path d="M57 40 c-8 2 -14 8 -18 16 c11 -2 18 -7 23 -15" fill="${CERT_GOLD}" stroke="none" opacity="0.72"/>
    <path d="M69 54 c-7 2 -13 7 -16 15 c10 -2 17 -7 21 -14" fill="${CERT_GOLD}" stroke="none" opacity="0.64"/>
  </g>`;

const starPath = (cx, cy, r, fill = CERT_GOLD) => {
  const points = Array.from({ length: 10 }).map((_, i) => {
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 === 0 ? r : r * 0.42;
    return `${(cx + rad * Math.cos(angle)).toFixed(1)},${(cy + rad * Math.sin(angle)).toFixed(1)}`;
  });

  return `<polygon points="${points.join(" ")}" fill="${fill}"/>`;
};

const smallDiamond = (cx, cy, size = 5, fill = CERT_GOLD) =>
  `<path d="M${cx} ${cy - size} l${size} ${size} l-${size} ${size} l-${size} -${size} z" fill="${fill}"/>`;

const laurelMarkup = (cx, cy) => {
  const leaves = Array.from({ length: 8 }).map((_, i) => {
    const t = i / 7;
    const y = cy - 50 + t * 98;
    const spread = Math.sin(t * Math.PI) * 22;
    const leftX = cx - 66 - spread;
    const rightX = cx + 66 + spread;
    const leftRotate = -42 + t * 64;
    const rightRotate = 42 - t * 64;

    return `
      <ellipse cx="${leftX.toFixed(1)}" cy="${y.toFixed(1)}" rx="4.4" ry="13" fill="${CERT_GOLD}" transform="rotate(${leftRotate.toFixed(1)} ${leftX.toFixed(1)} ${y.toFixed(1)})"/>
      <ellipse cx="${rightX.toFixed(1)}" cy="${y.toFixed(1)}" rx="4.4" ry="13" fill="${CERT_GOLD}" transform="rotate(${rightRotate.toFixed(1)} ${rightX.toFixed(1)} ${y.toFixed(1)})"/>`;
  }).join("");

  return `
    <path d="M${cx - 45} ${cy - 67} C${cx - 96} ${cy - 30} ${cx - 96} ${cy + 28} ${cx - 49} ${cy + 62}" fill="none" stroke="${CERT_GOLD}" stroke-width="2" opacity="0.88"/>
    <path d="M${cx + 45} ${cy - 67} C${cx + 96} ${cy - 30} ${cx + 96} ${cy + 28} ${cx + 49} ${cy + 62}" fill="none" stroke="${CERT_GOLD}" stroke-width="2" opacity="0.88"/>
    ${leaves}`;
};

const sealRibbonMarkup = (cx, cy) => `
  <path d="M${cx - 118} ${cy + 45} C${cx - 84} ${cy + 28} ${cx - 56} ${cy + 35} ${cx - 27} ${cy + 53} L${cx - 39} ${cy + 77} C${cx - 73} ${cy + 59} ${cx - 100} ${cy + 58} ${cx - 131} ${cy + 76} L${cx - 124} ${cy + 55} L${cx - 145} ${cy + 43} Z" fill="url(#navyRibbon)" stroke="${CERT_GOLD}" stroke-width="1.5"/>
  <path d="M${cx + 118} ${cy + 45} C${cx + 84} ${cy + 28} ${cx + 56} ${cy + 35} ${cx + 27} ${cy + 53} L${cx + 39} ${cy + 77} C${cx + 73} ${cy + 59} ${cx + 100} ${cy + 58} ${cx + 131} ${cy + 76} L${cx + 124} ${cy + 55} L${cx + 145} ${cy + 43} Z" fill="url(#navyRibbon)" stroke="${CERT_GOLD}" stroke-width="1.5"/>`;

const sealMarkup = (cx, cy, isTrust) => {
  const bumpCount = 42;
  const bumps = Array.from({ length: bumpCount })
    .map((_, i) => {
      const angle = (i / bumpCount) * Math.PI * 2;
      const x = cx + 57 * Math.cos(angle);
      const y = cy + 57 * Math.sin(angle);
      return `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="5.4" fill="url(#goldRadial)"/>`;
    })
    .join("");
  const icon = isTrust
    ? `<path d="M${cx} ${cy - 26} l23 9 v23 c0 20 -10.5 34 -23 41 c-12.5 -7 -23 -21 -23 -41 v-23 z" fill="#ffffff"/>
       <path d="M${cx} ${cy - 13} l10 4 v13 c0 10 -4.4 17 -10 21 c-5.6 -4 -10 -11 -10 -21 v-13 z" fill="${CERT_NAVY}"/>`
    : `<path d="M${cx - 20} ${cy + 2} l14 15 l30 -34" fill="none" stroke="#ffffff" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>`;

  return `
    <g filter="url(#medalShadow)">
      ${laurelMarkup(cx, cy)}
      ${sealRibbonMarkup(cx, cy)}
      ${starPath(cx - 22, cy - 93, 7, CERT_GOLD)}
      ${starPath(cx, cy - 100, 8, CERT_GOLD)}
      ${starPath(cx + 22, cy - 93, 7, CERT_GOLD)}
      ${bumps}
      <circle cx="${cx}" cy="${cy}" r="58" fill="url(#goldRadial)"/>
      <circle cx="${cx}" cy="${cy}" r="50" fill="${CERT_NAVY}" stroke="${CERT_GOLD_LIGHT}" stroke-width="2"/>
      <circle cx="${cx}" cy="${cy}" r="43" fill="url(#orangeMedal)" stroke="${CERT_GOLD_LIGHT}" stroke-width="2"/>
      <circle cx="${cx}" cy="${cy}" r="35" fill="none" stroke="#ffffff" stroke-opacity="0.38" stroke-width="1"/>
      ${icon}
    </g>`;
};

const plaqueMarkup = (cx, cy, width, label) => {
  const height = 41;
  const x = cx - width / 2;
  const y = cy - height / 2;

  return `
    <g filter="url(#softShadow)">
      <path d="M${x + 22} ${y} H${x + width - 22} L${x + width} ${cy} L${x + width - 22} ${y + height} H${x + 22} L${x} ${cy} Z" fill="${CERT_NAVY}" stroke="${CERT_GOLD_LIGHT}" stroke-width="2"/>
      <path d="M${x + 31} ${y + 6} H${x + width - 31} L${x + width - 12} ${cy} L${x + width - 31} ${y + height - 6} H${x + 31} L${x + 12} ${cy} Z" fill="none" stroke="${CERT_GOLD}" stroke-width="1"/>
      ${smallDiamond(x + 36, cy, 4, CERT_GOLD_LIGHT)}
      ${smallDiamond(x + width - 36, cy, 4, CERT_GOLD_LIGHT)}
      <text x="${cx}" y="${cy + 7}" text-anchor="middle" font-family="${SERIF_FONT_FAMILY}" font-size="19" font-weight="700" letter-spacing="1.4" fill="${CERT_GOLD_LIGHT}">${escapeXml(label)}</text>
    </g>`;
};

const badgeIconMarkup = (cx, cy, type) => {
  const iconColor = CERT_GOLD_LIGHT;
  const bodyByType = {
    proof: `
      <rect x="${cx - 13}" y="${cy - 11}" width="26" height="24" fill="none" stroke="${iconColor}" stroke-width="2"/>
      <path d="M${cx - 16} ${cy - 11} L${cx} ${cy - 24} L${cx + 16} ${cy - 11}" fill="none" stroke="${iconColor}" stroke-width="2"/>
      <path d="M${cx - 7} ${cy + 13} V${cy - 1} H${cx + 7} V${cy + 13}" fill="none" stroke="${iconColor}" stroke-width="2"/>
      <path d="M${cx - 7} ${cy - 6} H${cx - 2} M${cx + 3} ${cy - 6} H${cx + 8} M${cx - 7} ${cy + 1} H${cx - 2} M${cx + 3} ${cy + 1} H${cx + 8}" stroke="${iconColor}" stroke-width="1.6"/>`,
    address: `
      <path d="M${cx} ${cy + 20} C${cx - 18} ${cy - 2} ${cx - 14} ${cy - 24} ${cx} ${cy - 24} C${cx + 14} ${cy - 24} ${cx + 18} ${cy - 2} ${cx} ${cy + 20} Z" fill="none" stroke="${iconColor}" stroke-width="2.4"/>
      <circle cx="${cx}" cy="${cy - 8}" r="7" fill="none" stroke="${iconColor}" stroke-width="2.2"/>`,
    mobile: `
      <rect x="${cx - 10}" y="${cy - 23}" width="20" height="42" rx="4" fill="none" stroke="${iconColor}" stroke-width="2.3"/>
      <path d="M${cx - 5} ${cy - 16} H${cx + 5} M${cx - 3} ${cy + 12} H${cx + 3}" stroke="${iconColor}" stroke-width="1.8" stroke-linecap="round"/>`,
    email: `
      <rect x="${cx - 18}" y="${cy - 15}" width="36" height="28" rx="2" fill="none" stroke="${iconColor}" stroke-width="2.3"/>
      <path d="M${cx - 17} ${cy - 13} L${cx} ${cy + 1} L${cx + 17} ${cy - 13} M${cx - 15} ${cy + 12} L${cx - 3} ${cy + 1} M${cx + 15} ${cy + 12} L${cx + 3} ${cy + 1}" fill="none" stroke="${iconColor}" stroke-width="1.8"/>`,
  };

  return `
    <g filter="url(#softShadow)">
      <path d="M${cx} ${cy - 33} L${cx + 26} ${cy - 20} L${cx + 28} ${cy + 18} L${cx} ${cy + 34} L${cx - 28} ${cy + 18} L${cx - 26} ${cy - 20} Z" fill="${CERT_NAVY}" stroke="${CERT_GOLD_LIGHT}" stroke-width="2"/>
      <path d="M${cx} ${cy - 25} L${cx + 19} ${cy - 15} L${cx + 21} ${cy + 14} L${cx} ${cy + 26} L${cx - 21} ${cy + 14} L${cx - 19} ${cy - 15} Z" fill="none" stroke="${CERT_GOLD}" stroke-width="1"/>
      ${bodyByType[type] || bodyByType.proof}
    </g>`;
};

const verificationChip = ({ icon, label, iconCx, cy, width }) => {
  const pillX = iconCx + 33;
  const pillY = cy - 15;
  const checkX = pillX + 28;

  return `
    ${badgeIconMarkup(iconCx, cy, icon)}
    <rect x="${pillX}" y="${pillY}" width="${width}" height="30" rx="15" fill="${CERT_CREAM}" stroke="${CERT_GOLD}" stroke-width="1"/>
    <circle cx="${checkX}" cy="${cy}" r="10" fill="${CERT_GREEN}"/>
    <path d="M${checkX - 4.8} ${cy + 0.2} L${checkX - 1.5} ${cy + 3.6} L${checkX + 5.6} ${cy - 4.2}" fill="none" stroke="#ffffff" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/>
    <text x="${checkX + 24}" y="${cy + 5}" font-family="${CERTIFICATE_FONT_FAMILY}" font-size="12.5" font-weight="800" fill="${CERT_NAVY}">${escapeXml(label)}</text>`;
};

const ornamentalDivider = (cx, cy, width = 260) => `
  <line x1="${cx - width / 2}" y1="${cy}" x2="${cx - 24}" y2="${cy}" stroke="${CERT_GOLD}" stroke-width="1"/>
  ${smallDiamond(cx, cy, 5, CERT_GOLD)}
  <line x1="${cx + 24}" y1="${cy}" x2="${cx + width / 2}" y2="${cy}" stroke="${CERT_GOLD}" stroke-width="1"/>`;

const bottomMedallion = (cx, cy) => `
  <g filter="url(#medalShadow)">
    <circle cx="${cx}" cy="${cy}" r="37" fill="url(#goldRadial)"/>
    <circle cx="${cx}" cy="${cy}" r="29" fill="${CERT_NAVY}" stroke="${CERT_GOLD_LIGHT}" stroke-width="2"/>
    <path d="M${cx} ${cy - 16} l14 5.8 v14 c0 12 -6.1 20 -14 24 c-7.9 -4 -14 -12 -14 -24 v-14 z" fill="none" stroke="${CERT_GOLD_LIGHT}" stroke-width="2.4"/>
    <path d="M${cx - 7} ${cy + 1} l5 5.2 l10 -12" fill="none" stroke="${CERT_GOLD_LIGHT}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
  </g>`;

const bottomBands = () => `
  <path d="M0 884 C104 914 205 919 330 892 C480 858 592 858 720 884 V960 H0 Z" fill="${CERT_NAVY}"/>
  <path d="M0 916 C126 930 239 913 360 884 C506 850 616 868 720 902 V960 H0 Z" fill="${CERT_NAVY_DEEP}"/>
  <path d="M0 877 C105 907 206 912 330 892 C480 861 592 858 720 884" fill="none" stroke="url(#goldStroke)" stroke-width="8"/>
  <path d="M0 904 C123 924 228 911 360 884 C506 852 616 875 720 895" fill="none" stroke="${CERT_GOLD}" stroke-width="2" opacity="0.9"/>
  ${bottomMedallion(360, 875)}`;

const pagePath = "M18 22 H292 C320 22 344 12 360 0 C376 12 400 22 428 22 H702 V884 C618 890 526 915 442 948 H278 C194 915 102 890 18 884 Z";
const innerPagePath = "M31 35 H304 C326 35 347 26 360 15 C373 26 394 35 416 35 H689 V866 C607 875 521 898 433 931 H287 C199 898 113 875 31 866 Z";

const SIGNATURE_ASPECT = 849 / 376;

const signatureMarkup = (cx, bottomY, width) => {
  const height = width / SIGNATURE_ASPECT;
  const x = cx - width / 2;
  const y = bottomY - height;

  if (!SIGNATURE_DATA_URL) {
    return `<path d="M${x} ${bottomY - height / 2} c5,-13 11,-13 15,-3 c4,10 8,-15 13,-6 c4,7 7,-11 12,-4 c4,5 6,4 9,-2"
      fill="none" stroke="${CERT_NAVY}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" opacity="0.82"/>`;
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

export const buildCertificateSvg = async (business = {}, type = "verified") => {
  const isTrust = type === "trust";
  const rawBusinessName = business.businessName || business.name || "Business";
  const rawLocation = business.location || business.globalAddress || "Business location verified by MassClick";
  const businessNameLines = splitSvgTextLines(rawBusinessName, 34, 2);
  const locationLines = splitSvgTextLines(rawLocation, 34, 2);
  const statusCopy = isTrust
    ? ["has been certified by MassClick as a", "trusted business partner"]
    : ["has successfully completed MassClick's", "business verification process"];
  const certNo = `MC-${isTrust ? "TRU" : "VER"}-${(getBusinessId(business) || "000000").slice(-6).toUpperCase()}`;
  const issuedDate = formatCertificateDate(business.certificates?.generatedAt || new Date());
  const category = (business.category || "").trim();
  const categoryLabel = (category || (isTrust ? "TRUSTED BUSINESS" : "VERIFIED BUSINESS")).toUpperCase();

  const CX = 360;
  const sealCy = 178;
  const nameLineHeight = 37;
  const nameFontSize = businessNameLines.length > 1 ? 30 : 36;
  const locationLineHeight = 22;
  let cursor = 396;

  const certifyMarkupOut = `
    ${ornamentalDivider(CX, cursor - 7, 210)}
    <text x="${CX}" y="${cursor + 12}" text-anchor="middle" font-family="${SERIF_FONT_FAMILY}" font-style="italic" font-size="18" fill="#2d2d35">This is to certify that</text>`;
  cursor += 64;

  const nameY = cursor;
  const nameMarkupOut = textLinesMarkup({
    lines: businessNameLines,
    x: CX,
    y: nameY,
    lineHeight: nameLineHeight,
    fontSize: nameFontSize,
    fontWeight: 850,
    fill: CERT_NAVY,
  });
  cursor = nameY + (businessNameLines.length - 1) * nameLineHeight + 44;

  const plaqueWidth = Math.min(360, Math.max(260, categoryLabel.length * 12 + 92));
  const categoryMarkupOut = plaqueMarkup(CX, cursor, plaqueWidth, categoryLabel);
  cursor += 53;

  const locationY = cursor;
  const locationMarkupOut = textLinesMarkup({
    lines: locationLines,
    x: CX,
    y: locationY,
    lineHeight: locationLineHeight,
    fontSize: 17,
    fontWeight: 800,
    fill: CERT_NAVY,
  });
  cursor = locationY + (locationLines.length - 1) * locationLineHeight + 30;

  const statementY = cursor;
  const statementMarkupOut = `
    <text x="${CX}" y="${statementY}" text-anchor="middle" font-family="${CERTIFICATE_FONT_FAMILY}" font-size="16" fill="#2f3440">${escapeXml(statusCopy[0])}</text>
    <text x="${CX}" y="${statementY + 23}" text-anchor="middle" font-family="${CERTIFICATE_FONT_FAMILY}" font-size="17" font-weight="850" fill="${isTrust ? CERT_NAVY : CERT_ORANGE}">${escapeXml(statusCopy[1])}</text>`;
  cursor = statementY + 40;

  const checksRow1Y = Math.max(cursor + 36, 670);
  const checksRow2Y = checksRow1Y + 61;
  const checksMarkupOut = `
    ${ornamentalDivider(CX, checksRow1Y - 43, 190)}
    ${verificationChip({ icon: "proof", label: "Business Proof", iconCx: 154, cy: checksRow1Y, width: 166 })}
    ${verificationChip({ icon: "address", label: "Business Address", iconCx: 394, cy: checksRow1Y, width: 184 })}
    ${verificationChip({ icon: "mobile", label: "Mobile Number", iconCx: 154, cy: checksRow2Y, width: 166 })}
    ${verificationChip({ icon: "email", label: "Email ID", iconCx: 394, cy: checksRow2Y, width: 184 })}`;

  const qrBoxX = 78;
  const qrBoxY = 758;
  const qrBoxSize = 88;
  const qrSvg = await qrMarkup({
    url: buildCertificateVerifyUrl(business),
    x: qrBoxX + 8,
    y: qrBoxY + 8,
    size: qrBoxSize - 16,
    color: CERT_NAVY,
  });

  const logoW = 224;
  const logoH = logoW / (858 / 200);
  const logoTop = 782;
  const brandLogoMarkup = MASSCLICK_LOGO_DATA_URL
    ? `<image href="${escapeXml(MASSCLICK_LOGO_DATA_URL)}" x="${CX - logoW / 2}" y="${logoTop}" width="${logoW}" height="${logoH}" preserveAspectRatio="xMidYMid meet"/>`
    : `<text x="${CX}" y="${logoTop + 43}" text-anchor="middle" font-family="${CERTIFICATE_FONT_FAMILY}" font-size="36" font-weight="900" fill="${CERT_ORANGE}">Mass<tspan fill="${CERT_NAVY}">click</tspan></text>`;

  const sigCx = 590;
  const sigBottomY = 820;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="720" height="960" viewBox="0 0 720 960">
  <defs>
    <linearGradient id="paperGlow" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="#fff7e8"/>
      <stop offset="0.38" stop-color="${CERT_CREAM}"/>
      <stop offset="1" stop-color="#fffaf0"/>
    </linearGradient>
    <linearGradient id="goldStroke" x1="0" x2="1">
      <stop offset="0" stop-color="#9b6815"/>
      <stop offset="0.32" stop-color="${CERT_GOLD_LIGHT}"/>
      <stop offset="0.52" stop-color="#fff3aa"/>
      <stop offset="0.75" stop-color="${CERT_GOLD}"/>
      <stop offset="1" stop-color="#8f5d12"/>
    </linearGradient>
    <linearGradient id="navyRibbon" x1="0" x2="1">
      <stop offset="0" stop-color="#00051f"/>
      <stop offset="0.5" stop-color="#03235b"/>
      <stop offset="1" stop-color="#00051f"/>
    </linearGradient>
    <radialGradient id="goldRadial" cx="50%" cy="34%" r="70%">
      <stop offset="0" stop-color="#fff1a8"/>
      <stop offset="0.45" stop-color="#d59a2b"/>
      <stop offset="1" stop-color="#8f5d12"/>
    </radialGradient>
    <radialGradient id="orangeMedal" cx="35%" cy="28%" r="78%">
      <stop offset="0" stop-color="#ff8b28"/>
      <stop offset="0.58" stop-color="${CERT_ORANGE}"/>
      <stop offset="1" stop-color="#d84414"/>
    </radialGradient>
    <filter id="medalShadow" x="-30%" y="-30%" width="160%" height="170%">
      <feDropShadow dx="0" dy="9" stdDeviation="8" flood-color="#00051f" flood-opacity="0.27"/>
    </filter>
    <filter id="softShadow" x="-25%" y="-35%" width="150%" height="180%">
      <feDropShadow dx="0" dy="5" stdDeviation="4" flood-color="#00051f" flood-opacity="0.14"/>
    </filter>
    ${watermarkDefs()}
  </defs>

  <rect width="720" height="960" fill="${CERT_NAVY_DEEP}"/>
  <path d="${pagePath}" fill="url(#paperGlow)"/>
  <path d="${pagePath}" fill="url(#watermarkTile)" opacity="0.8"/>
  <path d="${pagePath}" fill="none" stroke="url(#goldStroke)" stroke-width="5"/>
  <path d="${innerPagePath}" fill="none" stroke="${CERT_NAVY}" stroke-width="2.2"/>
  <path d="M43 47 H312 C332 47 349 37 360 27 C371 37 388 47 408 47 H677 V842" fill="none" stroke="${CERT_GOLD_LIGHT}" stroke-width="1.2" opacity="0.92"/>
  <path d="M43 842 V47 M677 47 V842" fill="none" stroke="${CERT_GOLD}" stroke-width="1.2" opacity="0.82"/>

  ${cornerFlourish(50, 40, 1, 1)}
  ${cornerFlourish(670, 40, -1, 1)}

  <path d="M72 244 C174 208 236 244 332 226 C462 202 522 180 651 210" fill="none" stroke="${CERT_GOLD}" stroke-width="0.7" opacity="0.16"/>
  <path d="M60 610 C168 648 242 600 354 618 C462 636 548 650 658 600" fill="none" stroke="${CERT_GOLD}" stroke-width="0.7" opacity="0.13"/>

  <text x="${CX}" y="77" text-anchor="middle" font-family="${CERTIFICATE_FONT_FAMILY}" font-size="15" font-weight="800" letter-spacing="5" fill="${CERT_NAVY}">MASSCLICK BUSINESS VERIFICATION</text>
  <line x1="194" y1="76" x2="248" y2="76" stroke="${CERT_GOLD}" stroke-width="1"/>
  <line x1="472" y1="76" x2="526" y2="76" stroke="${CERT_GOLD}" stroke-width="1"/>
  ${ornamentalDivider(CX, 101, 96)}

  ${sealMarkup(CX, sealCy, isTrust)}

  <text x="${CX}" y="318" text-anchor="middle" font-family="${SERIF_FONT_FAMILY}" font-size="61" font-weight="700" letter-spacing="2" fill="${CERT_NAVY}">CERTIFICATE</text>
  <text x="${CX}" y="356" text-anchor="middle" font-family="${CERTIFICATE_FONT_FAMILY}" font-size="19" font-weight="700" letter-spacing="8" fill="${CERT_NAVY}">OF ${isTrust ? "TRUST" : "VERIFICATION"}</text>
  ${ornamentalDivider(CX, 372, 300)}

  ${certifyMarkupOut}
  ${nameMarkupOut}
  ${categoryMarkupOut}
  ${locationMarkupOut}
  ${statementMarkupOut}
  ${checksMarkupOut}

  ${bottomBands()}

  <rect x="${qrBoxX}" y="${qrBoxY}" width="${qrBoxSize}" height="${qrBoxSize}" rx="8" fill="#ffffff" stroke="${CERT_GOLD}" stroke-width="1.5"/>
  ${qrSvg}
  <text x="${qrBoxX + qrBoxSize / 2}" y="${qrBoxY + qrBoxSize + 19}" text-anchor="middle" font-family="${CERTIFICATE_FONT_FAMILY}" font-size="10.5" font-weight="850" letter-spacing="0.8" fill="${CERT_NAVY}">SCAN TO VERIFY</text>

  ${brandLogoMarkup}
  <text x="${CX}" y="${logoTop + logoH + 16}" text-anchor="middle" font-family="${CERTIFICATE_FONT_FAMILY}" font-size="12" font-weight="700" fill="${CERT_NAVY}">www.massclick.in</text>
  <line x1="${CX - 86}" y1="${logoTop + logoH + 12}" x2="${CX - 22}" y2="${logoTop + logoH + 12}" stroke="${CERT_GOLD}" stroke-width="1"/>
  <line x1="${CX + 22}" y1="${logoTop + logoH + 12}" x2="${CX + 86}" y2="${logoTop + logoH + 12}" stroke="${CERT_GOLD}" stroke-width="1"/>

  ${signatureMarkup(sigCx, sigBottomY, 136)}
  <line x1="${sigCx - 74}" y1="${sigBottomY + 8}" x2="${sigCx + 74}" y2="${sigBottomY + 8}" stroke="${CERT_GOLD}" stroke-width="1"/>
  <text x="${sigCx}" y="${sigBottomY + 27}" text-anchor="middle" font-family="${CERTIFICATE_FONT_FAMILY}" font-size="10.5" font-weight="850" letter-spacing="0.8" fill="${CERT_NAVY}">AUTHORIZED SIGNATORY</text>

  <text x="${CX}" y="934" text-anchor="middle" font-family="${CERTIFICATE_FONT_FAMILY}" font-size="12" font-weight="700" fill="${CERT_GOLD_LIGHT}">Certificate No. ${certNo}  |  Issued ${issuedDate}</text>
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
