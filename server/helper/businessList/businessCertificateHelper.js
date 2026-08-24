import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";
import {
  deleteObjectByKey,
  getImageDataUrlByKey,
  uploadImageToS3,
} from "../../s3Uploder.js";
import businessListModel from "../../model/businessList/businessListModel.js";
import { getBusinessId } from "./businessPublicUrlHelper.js";
import { s3Keys } from "../../utils/s3ObjectKeys.js";
import { assetUrl } from "../../utils/assetUrl.js";

// The certificate is a fixed artwork plate (gold border, medal, star row,
// MassClick mark, verified seal, signature block, Play badge, disclaimer and
// URL — everything that never changes) with only the per-business fields drawn
// on top. Hand-coding those ornaments as SVG paths could only ever approximate
// the design; compositing the artwork itself makes the output identical to the
// source design by construction.
//
// The plate was reconstructed from the designer's 80 per-business PDFs. Because
// only the logo, name and location differ between them, a per-pixel median over
// the whole set recovers the background those three fields sit on — see
// scripts/buildCertificatePlate.py, which rebuilds it from that folder.
//
// Because the plate is fixed, every field below sits in a fixed slot and long
// values shrink to fit rather than pushing the layout down.

export const CERTIFICATE_TEMPLATE_VERSION = 20;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Kept inside server/ (not client/) so these ship with the backend deploy,
// which packages only the server directory.
const ASSET_DIR = path.resolve(__dirname, "../../assets/certificates");

// Bundled via fontconfig in utils/fontBootstrap.js. librsvg ignores @font-face,
// so these names must match the family names of the fonts in assets/fonts.
//
// The artwork sets the business name and location in Altone, which ships only
// under a trial licence and so cannot go on the server. Poppins is the closest
// geometric sans we can licence (SIL OFL) and the designer already uses it for
// the disclaimer line on this same certificate, so the two agree. Tamil has no
// Poppins cut; Noto Sans Tamil picks up business names written in Tamil script.
const TEXT_FONT_FAMILY = "'Poppins', 'Noto Sans Tamil', sans-serif";

// Sampled from the plate so drawn text matches the artwork it sits on.
const CERT_NAVY = "#151645";

// Design space — the artwork's own PDF point size, so every coordinate below is
// read straight off the source design with no conversion.
const CERT_WIDTH = 576;
const CERT_HEIGHT = 864;
const RENDER_SCALE = 2.5;
const CX = CERT_WIDTH / 2;

// Every per-business field, in design-space coordinates. Tune here — nothing
// else in this file carries layout numbers.
const CERTIFICATE_LAYOUT = {
  // Logos in the source set are wordmarks as often as they are marks, so the
  // slot is wide and short and the image is contained inside it rather than
  // filled to it. No frame: the design sits the logo straight on the paper.
  //
  // Hung from its top edge, not centred: across the 80 reference certificates
  // the logo's top sits at 262.8 with almost no spread (p25-p95 is 262.4-263.6)
  // while its height varies with the artwork, so the designer clearly aligned
  // tops and let logos hang to different depths.
  businessLogo: { cx: CX, top: 262.8, maxLogoWidth: 430, maxLogoHeight: 80 },

  // Name and location are laid out as one block centred on `cy`, so a name that
  // wraps to two lines pushes the location down instead of overprinting it. The
  // centre and gap are taken from the design's one-line case, which is what all
  // but a handful of the 80 reference certificates use. topLimit clears a
  // full-height logo (262.8 + 80) by a hair.
  stack: { cy: 372, gap: 5, topLimit: 346, bottomLimit: 419 },

  businessName: { maxWidth: 430, fontSize: 20, minFontSize: 12.5, lineHeight: 23, maxLines: 2, weight: 700, fill: CERT_NAVY },
  // One line only: immediately below the location sits the star row, which is
  // painted on the plate and cannot move out of the way.
  location: { maxWidth: 430, fontSize: 16, minFontSize: 10.5, lineHeight: 19, maxLines: 1, weight: 400, fill: CERT_NAVY },
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
    const mime = fileName.endsWith(".png") ? "image/png" : "image/jpeg";
    return `data:${mime};base64,${buffer.toString("base64")}`;
  } catch (error) {
    console.warn(`[Certificate] Unable to read ${label} (${fileName}):`, error.message);
    return "";
  }
};

// Read once at boot — the plates are a few hundred KB each and never change.
// Authored at exactly the output resolution so rendering is a 1:1 blit.
//
// Verified and trust currently share one artwork: the designer delivered a
// single design. Dropping a distinct plate-trust.jpg in place is all that is
// needed if trust-specific artwork ever arrives.
const PLATES = {
  verified: readAssetDataUrl("plate-verified.jpg", "verified certificate plate"),
  trust: readAssetDataUrl("plate-trust.jpg", "trust certificate plate"),
};

const appendCertificateUrls = (business = {}) => {
  const result = business?.toObject?.() || business;
  // Certificate keys are now stable (see uploadCertificateImage) — version off
  // generatedAt, falling back to the document's updatedAt, same pattern as the
  // review/profile QR cache-buster in businessListHelper.js.
  const version = result.certificates?.generatedAt || result.updatedAt;

  if (result.certificates?.verifiedCertificateKey) {
    result.certificates.verifiedCertificateUrl = assetUrl(
      result.certificates.verifiedCertificateKey,
      { version },
    );
  }

  if (result.certificates?.trustCertificateKey) {
    result.certificates.trustCertificateUrl = assetUrl(
      result.certificates.trustCertificateKey,
      { version },
    );
  }

  return result;
};

// ---- fitting text into fixed slots -------------------------------------------

// Text has to fit slots on a fixed plate, so we need real widths, not an
// average-glyph guess — that guess ignored letter-spacing and undershot
// uppercase caps badly enough to run long names past the paper edge. Instead,
// render each string once offscreen and measure its ink. Width scales linearly
// with font size, so one measurement per string covers every candidate size.
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

// Name and location are one block: measure both, then hand each its own centre
// line so the pair stays centred on the plate's open area whatever they wrap to.
const stackCentres = (nameBlock, locationBlock, layout) => {
  const { businessName, location, stack } = layout;
  const nameHeight = nameBlock.lines.length * businessName.lineHeight;
  const locationHeight = locationBlock.lines.length * location.lineHeight;
  const total = nameHeight + stack.gap + locationHeight;

  // Clamp rather than let a tall block collide with the logo above or the star
  // row below, both of which are painted on the plate and cannot move.
  let top = stack.cy - total / 2;
  top = Math.min(top, stack.bottomLimit - total);
  top = Math.max(top, stack.topLimit);

  return {
    nameCy: top + nameHeight / 2,
    locationCy: top + nameHeight + stack.gap + locationHeight / 2,
  };
};

const dataUrlToBuffer = (dataUrl = "") => {
  const match = String(dataUrl).match(/^data:([\w/+.-]+);base64,(.+)$/);
  if (!match) return null;

  return {
    contentType: match[1],
    buffer: Buffer.from(match[2], "base64"),
  };
};

const resolveBusinessLogoDataUrl = async (business = {}) => {
  if (typeof business.logoImageData === "string" && business.logoImageData.startsWith("data:image/")) {
    return business.logoImageData;
  }

  if (typeof business.logoImage === "string" && business.logoImage.startsWith("data:image/")) {
    return business.logoImage;
  }

  if (!business.logoImageKey) {
    return "";
  }

  try {
    return await getImageDataUrlByKey(business.logoImageKey);
  } catch (error) {
    console.warn("[Certificate] Unable to load business logo for certificate:", error.message);
    return "";
  }
};

const prepareLogoImage = async (logoDataUrl, layout) => {
  const parsed = dataUrlToBuffer(logoDataUrl);
  if (!parsed) return null;

  try {
    const metadata = await sharp(parsed.buffer).rotate().metadata();
    if (!metadata.width || !metadata.height) return null;

    const scale = Math.min(
      layout.maxLogoWidth / metadata.width,
      layout.maxLogoHeight / metadata.height,
    );
    const drawWidth = Math.max(1, metadata.width * scale);
    const drawHeight = Math.max(1, metadata.height * scale);
    const png = await sharp(parsed.buffer)
      .rotate()
      .resize({
        width: Math.round(drawWidth * RENDER_SCALE),
        height: Math.round(drawHeight * RENDER_SCALE),
        fit: "contain",
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toBuffer();

    return {
      dataUrl: `data:image/png;base64,${png.toString("base64")}`,
      drawWidth,
      drawHeight,
    };
  } catch (error) {
    console.warn("[Certificate] Unable to prepare business logo for certificate:", error.message);
    return null;
  }
};

const businessLogoMarkup = async (business = {}, layout) => {
  const logo = await prepareLogoImage(await resolveBusinessLogoDataUrl(business), layout);

  // A business without a logo still needs something in the slot, or the paper
  // reads as a printing fault. Their initial, set in the certificate's own face,
  // sitting on the same baseline a full-height logo would occupy.
  if (!logo) {
    const initial = escapeXml(
      String(business.businessName || business.name || "M").trim().charAt(0).toUpperCase() || "M",
    );
    return `<text x="${layout.cx}" y="${(layout.top + 62).toFixed(2)}" text-anchor="middle" font-family="${TEXT_FONT_FAMILY}" font-size="64" font-weight="600" fill="${CERT_NAVY}">${initial}</text>`;
  }

  const x = layout.cx - logo.drawWidth / 2;

  return `<image href="${escapeXml(logo.dataUrl)}" x="${x.toFixed(2)}" y="${layout.top.toFixed(2)}" width="${logo.drawWidth.toFixed(2)}" height="${logo.drawHeight.toFixed(2)}" preserveAspectRatio="xMidYMid meet"/>`;
};

// ---- main builder ------------------------------------------------------------

export const buildCertificateSvg = async (business = {}, type = "verified") => {
  const layout = CERTIFICATE_LAYOUT;
  const plate = PLATES[type === "trust" ? "trust" : "verified"];

  const rawBusinessName = business.businessName || business.name || "Business";
  const rawLocation = business.globalAddress || business.location || "Tamil Nadu, India";

  const nameBlock = await fitTextBlock(rawBusinessName, layout.businessName);
  const locationBlock = await fitTextBlock(rawLocation, layout.location);
  const { nameCy, locationCy } = stackCentres(nameBlock, locationBlock, layout);
  const logoSvg = await businessLogoMarkup(business, layout.businessLogo);

  // Without a plate the fields would render on transparency; a plain card keeps
  // the certificate legible and makes the missing asset obvious.
  const background = plate
    ? `<image href="${escapeXml(plate)}" x="0" y="0" width="${CERT_WIDTH}" height="${CERT_HEIGHT}" preserveAspectRatio="xMidYMid slice"/>`
    : `<rect width="${CERT_WIDTH}" height="${CERT_HEIGHT}" fill="#fffdf7"/>
  <rect x="18" y="18" width="${CERT_WIDTH - 36}" height="${CERT_HEIGHT - 36}" fill="none" stroke="#c38a22" stroke-width="4"/>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${CERT_WIDTH}" height="${CERT_HEIGHT}" viewBox="0 0 ${CERT_WIDTH} ${CERT_HEIGHT}">
  ${background}

  ${logoSvg}

  ${textBlockMarkup({ ...layout.businessName, ...nameBlock, cy: nameCy })}

  ${textBlockMarkup({ ...layout.location, ...locationBlock, cy: locationCy })}
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
  const svg = await buildCertificateSvg(business, type);
  const png = await renderCertificatePng(svg);
  // STABLE key — the registry declares certificate-verified/certificate-trust
  // stable, so regeneration overwrites the same object instead of orphaning the
  // previous one (this used to mint a fresh Date.now() key specifically to dodge
  // the 1-year Cache-Control on a reused key; now that assetUrl(key, {version})
  // exists, every read site below versions off certificates.generatedAt instead).
  const uploadPath =
    type === "trust"
      ? s3Keys.business.trustCertificate(businessId)
      : s3Keys.business.verifiedCertificate(businessId);
  const uploadResult = await uploadImageToS3(
    png,
    uploadPath,
    {
      skipImageConversion: true,
      contentType: "image/png",
      extension: "png",
    },
  );

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
  return { business: result, trace };
};
