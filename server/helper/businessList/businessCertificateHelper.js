import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";
import QRCode from "qrcode";
import {
  deleteObjectByKey,
  getSignedUrlByKey,
  uploadImageToS3,
} from "../../s3Uploder.js";
import businessListModel from "../../model/businessList/businessListModel.js";
import { buildBusinessDetailsUrl, getBusinessId } from "./businessPublicUrlHelper.js";

// The certificate is a fixed artwork plate (border, seal, laurel, verification
// chips, headings, bottom band — everything that never changes) with only the
// per-business fields drawn on top. Hand-coding those ornaments as SVG paths
// could only ever approximate the design; compositing the artwork itself makes
// the output identical to the source design by construction.
//
// Because the plate is fixed, every field below sits in a fixed slot and
// long values shrink to fit rather than pushing the layout down.

export const CERTIFICATE_TEMPLATE_VERSION = 15;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Kept inside server/ (not client/) so these ship with the backend deploy,
// which packages only the server directory.
const ASSET_DIR = path.resolve(__dirname, "../../assets/certificates");

// Bundled via fontconfig in utils/fontBootstrap.js. librsvg ignores @font-face,
// so these names must match the family names of the fonts in assets/fonts.
const SANS = "Noto Sans";
const SANS_TAMIL = "Noto Sans Tamil";
const TEXT_FONT_FAMILY = `'${SANS}', '${SANS_TAMIL}', sans-serif`;
const SERIF_FONT_FAMILY = "'Noto Serif', serif";

const CERT_NAVY = "#000b33";
const CERT_GOLD = "#c38a22";
const CERT_GOLD_LIGHT = "#f3d371";

// Design space. The plate is authored at 2x and rendered down to this box.
const CERT_WIDTH = 720;
const CERT_HEIGHT = 960;
const RENDER_SCALE = 2;
const CX = CERT_WIDTH / 2;

// Every per-business field, in design-space coordinates. Tune here — nothing
// else in this file carries layout numbers.
const LAYOUT = {
  businessName: { cy: 452, maxWidth: 540, fontSize: 36, minFontSize: 22, lineHeight: 37, maxLines: 2, weight: 850, fill: CERT_NAVY },
  // textClearance: the diamond markers sit 36 in from each end of the plaque,
  // so the label needs ~50 of clearance either side to stay clear of them.
  categoryPlaque: { cy: 516, minWidth: 260, maxWidth: 430, fontSize: 19, minFontSize: 12, letterSpacing: 1.4, textClearance: 100 },
  location: { cy: 562, maxWidth: 430, fontSize: 17, minFontSize: 12, lineHeight: 22, maxLines: 2, weight: 800, fill: CERT_NAVY },
  qr: { x: 78, y: 758, size: 88, padding: 8 },
  footer: { cy: 934, fontSize: 12, fill: CERT_GOLD_LIGHT },
};

const escapeXml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const readAssetDataUrl = (fileName, label) => {
  try {
    const buffer = fs.readFileSync(path.join(ASSET_DIR, fileName));
    return `data:image/png;base64,${buffer.toString("base64")}`;
  } catch (error) {
    console.warn(`[Certificate] Unable to read ${label} (${fileName}):`, error.message);
    return "";
  }
};

// Read once at boot — the plates are a few hundred KB each and never change.
const PLATES = {
  verified: readAssetDataUrl("plate-verified.png", "verified certificate plate"),
  trust: readAssetDataUrl("plate-trust.png", "trust certificate plate"),
};

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

// ---- fitting text into fixed slots -------------------------------------------

// Text has to fit slots on a fixed plate, so we need real widths, not an
// average-glyph guess — that guess ignored letter-spacing and undershot
// uppercase serif caps badly enough to run the category label through the
// plaque's diamond markers. Instead, render each string once offscreen and
// measure its ink. Width scales linearly with font size, so one measurement
// per string covers every candidate size.
const MEASURE_REF_SIZE = 64;
const MEASURE_PAD = 40;
const measureCache = new Map();

const measureAdvanceRatio = async (text, fontFamily, weight) => {
  const key = `${fontFamily}|${weight}|${text}`;
  const cached = measureCache.get(key);
  if (cached !== undefined) return cached;

  const width = Math.ceil(String(text).length * MEASURE_REF_SIZE * 1.4) + MEASURE_PAD * 2;
  const height = MEASURE_REF_SIZE * 3;
  const probe = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <rect width="${width}" height="${height}" fill="#fff"/>
    <text x="${MEASURE_PAD}" y="${MEASURE_REF_SIZE * 2}" font-family="${fontFamily}" font-size="${MEASURE_REF_SIZE}" font-weight="${weight}" fill="#000">${escapeXml(text)}</text>
  </svg>`;

  let ratio = String(text).length * 0.6; // only used if the probe render fails
  try {
    const { data, info } = await sharp(Buffer.from(probe), { density: 72 })
      .greyscale()
      .raw()
      .toBuffer({ resolveWithObject: true });

    let minX = info.width;
    let maxX = -1;
    for (let y = 0; y < info.height; y++) {
      const row = y * info.width;
      for (let x = 0; x < info.width; x++) {
        if (data[row + x] < 200) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
        }
      }
    }

    if (maxX >= minX) {
      ratio = (maxX - minX + 1) / MEASURE_REF_SIZE;
    }
  } catch (error) {
    console.warn("[Certificate] Text measurement failed, using estimate:", error.message);
  }

  measureCache.set(key, ratio);
  return ratio;
};

// letter-spacing is an absolute length, so it does not scale with font size.
const measureTextWidth = async (text, { fontSize, fontFamily, weight, letterSpacing = 0 }) => {
  const ratio = await measureAdvanceRatio(text, fontFamily, weight);
  const gaps = Math.max(0, String(text).length - 1);
  return ratio * fontSize + gaps * letterSpacing;
};

// Split into `lineCount` lines at the word break that minimises the widest
// line, so a two-line name reads balanced instead of 1-word / 5-word.
const wrapToLines = (value, lineCount) => {
  const words = String(value || "").trim().split(/\s+/).filter(Boolean);
  if (!words.length) return ["Business"];
  if (lineCount <= 1 || words.length < lineCount) return [words.join(" ")];

  let best = null;
  const walk = (index, current, lines) => {
    if (lines.length === lineCount - 1) {
      const tail = words.slice(index).join(" ");
      if (!tail) return;
      const candidate = [...lines, tail];
      const widest = Math.max(...candidate.map(l => l.length));
      if (!best || widest < best.widest) best = { lines: candidate, widest };
      return;
    }
    for (let i = index; i < words.length - (lineCount - lines.length - 1); i++) {
      walk(i + 1, null, [...lines, words.slice(index, i + 1).join(" ")]);
    }
  };
  walk(0, null, []);

  return best ? best.lines : [words.join(" ")];
};

// Prefer fewer lines at full size; only add a line once shrinking would push
// the text below its minimum readable size.
const fitTextBlock = async (value, { maxWidth, fontSize, minFontSize, maxLines, weight, letterSpacing = 0, fontFamily = TEXT_FONT_FAMILY }) => {
  let fallback = null;

  for (let lineCount = 1; lineCount <= maxLines; lineCount++) {
    const lines = wrapToLines(value, lineCount);
    if (lines.length !== lineCount) continue;

    const widths = await Promise.all(
      lines.map(line => measureTextWidth(line, { fontSize, fontFamily, weight, letterSpacing })),
    );
    const widest = Math.max(...widths);

    if (widest <= maxWidth) return { lines, fontSize };

    // Widths scale linearly, so the fitting size follows directly.
    const scaled = Math.floor((fontSize * (maxWidth / widest)) * 2) / 2;
    if (scaled >= minFontSize) return { lines, fontSize: scaled };
    if (!fallback) fallback = { lines, fontSize: minFontSize };
  }

  return fallback || { lines: wrapToLines(value, 1), fontSize: minFontSize };
};

// Vertically centre a block of lines on `cy` so a 1-line and a 2-line value
// both sit in the middle of the same fixed slot.
const textBlockMarkup = ({ lines, fontSize, cy, lineHeight, weight, fill, fontFamily = TEXT_FONT_FAMILY, letterSpacing }) => {
  const firstBaseline = cy - ((lines.length - 1) * lineHeight) / 2 + fontSize * 0.35;

  return lines
    .map(
      (line, index) =>
        `<text x="${CX}" y="${(firstBaseline + index * lineHeight).toFixed(2)}" text-anchor="middle" font-family="${fontFamily}" font-size="${fontSize}" font-weight="${weight}" fill="${fill}"${letterSpacing ? ` letter-spacing="${letterSpacing}"` : ""}>${escapeXml(line)}</text>`,
    )
    .join("\n  ");
};

// ---- the one ornament we still draw ------------------------------------------

const smallDiamond = (cx, cy, size = 5, fill = CERT_GOLD) =>
  `<path d="M${cx} ${cy - size} l${size} ${size} l-${size} ${size} l-${size} -${size} z" fill="${fill}"/>`;

// The category plaque is drawn rather than baked into the plate because its
// width tracks the label length.
const plaqueMarkup = (cy, width, label, fontSize, letterSpacing) => {
  const height = 41;
  const x = CX - width / 2;
  const y = cy - height / 2;

  return `
    <g filter="url(#softShadow)">
      <path d="M${x + 22} ${y} H${x + width - 22} L${x + width} ${cy} L${x + width - 22} ${y + height} H${x + 22} L${x} ${cy} Z" fill="${CERT_NAVY}" stroke="${CERT_GOLD_LIGHT}" stroke-width="2"/>
      <path d="M${x + 31} ${y + 6} H${x + width - 31} L${x + width - 12} ${cy} L${x + width - 31} ${y + height - 6} H${x + 31} L${x + 12} ${cy} Z" fill="none" stroke="${CERT_GOLD}" stroke-width="1"/>
      ${smallDiamond(x + 36, cy, 4, CERT_GOLD_LIGHT)}
      ${smallDiamond(x + width - 36, cy, 4, CERT_GOLD_LIGHT)}
      <text x="${CX}" y="${cy + fontSize * 0.36}" text-anchor="middle" font-family="${SERIF_FONT_FAMILY}" font-size="${fontSize}" font-weight="700" letter-spacing="${letterSpacing}" fill="${CERT_GOLD_LIGHT}">${escapeXml(label)}</text>
    </g>`;
};

const qrMarkup = async ({ url, x, y, size, color }) => {
  try {
    const raw = await QRCode.toString(url, {
      type: "svg",
      margin: 0,
      color: { dark: color, light: "#00000000" },
    });
    const viewBoxMatch = raw.match(/viewBox="([^"]+)"/);
    const bodyMatch = raw.match(/<svg[^>]*>([\s\S]*)<\/svg>/);

    if (!viewBoxMatch || !bodyMatch) return "";

    return `<svg x="${x}" y="${y}" width="${size}" height="${size}" viewBox="${viewBoxMatch[1]}">${bodyMatch[1]}</svg>`;
  } catch (error) {
    console.warn("[Certificate] Unable to build QR code:", error.message);
    return "";
  }
};

// ---- main builder ------------------------------------------------------------

export const buildCertificateSvg = async (business = {}, type = "verified") => {
  const isTrust = type === "trust";
  const plate = PLATES[isTrust ? "trust" : "verified"];

  const rawBusinessName = business.businessName || business.name || "Business";
  const rawLocation = business.location || business.globalAddress || "Business location verified by MassClick";
  const category = (business.category || "").trim();
  const categoryLabel = (category || (isTrust ? "TRUSTED BUSINESS" : "VERIFIED BUSINESS")).toUpperCase();
  const certNo = `MC-${isTrust ? "TRU" : "VER"}-${(getBusinessId(business) || "000000").slice(-6).toUpperCase()}`;
  const issuedDate = formatCertificateDate(business.certificates?.generatedAt || new Date());

  const nameBlock = await fitTextBlock(rawBusinessName, LAYOUT.businessName);
  const locationBlock = await fitTextBlock(rawLocation, LAYOUT.location);

  // Grow the plaque to fit its label, then shrink the label if the plaque has
  // hit its maximum width.
  const plaqueCfg = LAYOUT.categoryPlaque;
  const plaqueTextOptions = {
    fontSize: plaqueCfg.fontSize,
    fontFamily: SERIF_FONT_FAMILY,
    weight: 700,
    letterSpacing: plaqueCfg.letterSpacing,
  };
  const labelWidth = await measureTextWidth(categoryLabel, plaqueTextOptions);
  const plaqueWidth = Math.min(
    plaqueCfg.maxWidth,
    Math.max(plaqueCfg.minWidth, labelWidth + plaqueCfg.textClearance),
  );
  const availableLabelWidth = plaqueWidth - plaqueCfg.textClearance;
  const plaqueFontSize =
    labelWidth <= availableLabelWidth
      ? plaqueCfg.fontSize
      : Math.max(
          plaqueCfg.minFontSize,
          Math.floor(plaqueCfg.fontSize * (availableLabelWidth / labelWidth) * 2) / 2,
        );

  const qr = LAYOUT.qr;
  const qrSvg = await qrMarkup({
    url: buildCertificateVerifyUrl(business),
    x: qr.x + qr.padding,
    y: qr.y + qr.padding,
    size: qr.size - qr.padding * 2,
    color: CERT_NAVY,
  });

  // Without a plate the fields would render on transparency; a plain card keeps
  // the certificate legible and makes the missing asset obvious.
  const background = plate
    ? `<image href="${escapeXml(plate)}" x="0" y="0" width="${CERT_WIDTH}" height="${CERT_HEIGHT}" preserveAspectRatio="xMidYMid slice"/>`
    : `<rect width="${CERT_WIDTH}" height="${CERT_HEIGHT}" fill="#fffdf7"/>
  <rect x="18" y="18" width="${CERT_WIDTH - 36}" height="${CERT_HEIGHT - 36}" fill="none" stroke="${CERT_GOLD}" stroke-width="4"/>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${CERT_WIDTH}" height="${CERT_HEIGHT}" viewBox="0 0 ${CERT_WIDTH} ${CERT_HEIGHT}">
  <defs>
    <filter id="softShadow" x="-25%" y="-35%" width="150%" height="180%">
      <feDropShadow dx="0" dy="5" stdDeviation="4" flood-color="#00051f" flood-opacity="0.14"/>
    </filter>
  </defs>

  ${background}

  ${textBlockMarkup({ ...LAYOUT.businessName, ...nameBlock })}

  ${plaqueMarkup(plaqueCfg.cy, plaqueWidth, categoryLabel, plaqueFontSize, plaqueCfg.letterSpacing)}

  ${textBlockMarkup({ ...LAYOUT.location, ...locationBlock })}

  <rect x="${qr.x}" y="${qr.y}" width="${qr.size}" height="${qr.size}" rx="8" fill="#ffffff" stroke="${CERT_GOLD}" stroke-width="1.5"/>
  ${qrSvg}

  <text x="${CX}" y="${LAYOUT.footer.cy}" text-anchor="middle" font-family="${TEXT_FONT_FAMILY}" font-size="${LAYOUT.footer.fontSize}" font-weight="700" fill="${LAYOUT.footer.fill}">Certificate No. ${escapeXml(certNo)}  |  Issued ${escapeXml(issuedDate)}</text>
</svg>`;
};

// Rasterise on the server so every consumer gets the same pixels. Rendering in
// the browser made the output depend on the viewer's installed fonts and on
// whether their engine honoured SVG filters.
export const renderCertificatePng = async (svg) =>
  sharp(Buffer.from(svg, "utf8"), { density: 72 * RENDER_SCALE })
    .resize(CERT_WIDTH * RENDER_SCALE, CERT_HEIGHT * RENDER_SCALE, { fit: "fill" })
    .png({ compressionLevel: 9 })
    .toBuffer();

const uploadCertificateImage = async (business = {}, type = "verified") => {
  const businessId = getBusinessId(business);
  const businessSlug = slugifyCertificateValue(
    business.businessName || business.name || businessId,
  );
  const svg = await buildCertificateSvg(business, type);
  const png = await renderCertificatePng(svg);
  // Timestamped key: uploads set a 1-year Cache-Control and certificate URLs
  // are stable public URLs, so overwriting the same key leaves browsers
  // serving the stale cached file. A fresh key per regeneration busts that.
  const uploadResult = await uploadImageToS3(
    png,
    `businessList/certificates/${businessId}/${type}-${businessSlug}-${Date.now()}`,
    {
      skipImageConversion: true,
      contentType: "image/png",
      extension: "png",
    },
  );

  console.log(`[CertificateRegenerate] Uploaded ${type} certificate PNG: ${uploadResult.key}`);

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
    outputContentType: "image/png",
    fontFamily: TEXT_FONT_FAMILY,
    platesLoaded: { verified: !!PLATES.verified, trust: !!PLATES.trust },
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
