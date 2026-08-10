import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";
import QRCode from "qrcode";
import {
  deleteObjectByKey,
  getImageDataUrlByKey,
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

export const CERTIFICATE_TEMPLATE_VERSION = 19;

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

// Sampled from the plate so drawn text matches the artwork it sits on.
const CERT_NAVY = "#07183f";
const CERT_GOLD = "#c38a22";
const CERT_PLAQUE_GOLD = "#f1d275";
const CERT_TRUST_ORANGE = "#ff8a2a";
const CERT_FOOTER_GOLD = "#e5bd5a";
const CERT_PAPER = "#fffdf7";

// Design space. The plate is authored at 2x and rendered down to this box.
const CERT_WIDTH = 720;
const CERT_HEIGHT = 960;
const RENDER_SCALE = 2;
const CX = CERT_WIDTH / 2;

// Every per-business field, in design-space coordinates. Tune here — nothing
// else in this file carries layout numbers.
// Slots are derived from the plate: each one is the region cleared by
// scripts/buildCertificatePlate.cjs, so text can never collide with artwork.
const CERTIFICATE_LAYOUTS = {
  verified: {
    stars: { cx: CX, cy: 120, count: 5, outerRadius: 8, innerRadius: 3.4, spacing: 20, fill: CERT_GOLD },
    businessLogo: { cx: CX, cy: 495, maxLogoWidth: 72, maxLogoHeight: 74, paddingX: 17, paddingY: 13, minFrameWidth: 96, minFrameHeight: 88, maxFrameWidth: 134, maxFrameHeight: 112 },
    businessName: { cy: 574, maxWidth: 438, fontSize: 26, minFontSize: 15, lineHeight: 28, maxLines: 2, weight: 800, fill: CERT_NAVY, letterSpacing: -0.7 },
    // The plaque itself is part of the plate; only its label is drawn.
    category: { cy: 625, maxWidth: 275, fontSize: 17, minFontSize: 10.5, lineHeight: 18, maxLines: 1, weight: 700, fill: CERT_PLAQUE_GOLD, fontFamily: SERIF_FONT_FAMILY, letterSpacing: 0.3 },
    location: { cy: 662, maxWidth: 245, fontSize: 17, minFontSize: 11, lineHeight: 19, maxLines: 2, weight: 800, fill: CERT_NAVY },
    // The white box and its gold border are on the plate; only the code is drawn.
    qr: { x: 79, y: 797, size: 82 },
    footer: { cy: 943, maxWidth: 360, fontSize: 12, minFontSize: 8, lineHeight: 12, maxLines: 1, weight: 400, fill: CERT_FOOTER_GOLD, fontFamily: SERIF_FONT_FAMILY },
  },
  trust: {
    businessLogo: { cx: CX, cy: 467, maxLogoWidth: 62, maxLogoHeight: 66, paddingX: 15, paddingY: 12, minFrameWidth: 86, minFrameHeight: 78, maxFrameWidth: 116, maxFrameHeight: 96, frameStyle: "trust" },
    businessName: { cy: 527, maxWidth: 410, fontSize: 29, minFontSize: 15, lineHeight: 30, maxLines: 2, weight: 700, fill: CERT_NAVY, fontFamily: SERIF_FONT_FAMILY, letterSpacing: -0.4 },
    category: { cy: 579, maxWidth: 292, fontSize: 18, minFontSize: 10.5, lineHeight: 18, maxLines: 1, weight: 700, fill: CERT_TRUST_ORANGE, fontFamily: SERIF_FONT_FAMILY, letterSpacing: 0.3 },
    location: { cy: 614, maxWidth: 220, fontSize: 17, minFontSize: 11, lineHeight: 19, maxLines: 2, weight: 700, fill: CERT_NAVY, fontFamily: SERIF_FONT_FAMILY },
    qr: { x: 76, y: 766, size: 74 },
    footer: { cy: 937, maxWidth: 390, fontSize: 12, minFontSize: 8, lineHeight: 12, maxLines: 1, weight: 400, fill: CERT_FOOTER_GOLD, fontFamily: SERIF_FONT_FAMILY },
  },
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
const PLATES = {
  verified: readAssetDataUrl("plate-verified.jpg", "verified certificate plate"),
  trust: readAssetDataUrl("plate-trust.jpg", "trust certificate plate"),
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

const starPoints = ({ cx, cy, outerRadius, innerRadius }) => {
  const points = [];
  const startAngle = -Math.PI / 2;

  for (let i = 0; i < 10; i++) {
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    const angle = startAngle + (i * Math.PI) / 5;
    points.push(`${(cx + Math.cos(angle) * radius).toFixed(2)},${(cy + Math.sin(angle) * radius).toFixed(2)}`);
  }

  return points.join(" ");
};

const starsMarkup = (layout) => {
  if (!layout) return "";

  const firstX = layout.cx - ((layout.count - 1) * layout.spacing) / 2;
  return `<g>
    ${Array.from({ length: layout.count }, (_, index) => {
      const cx = firstX + index * layout.spacing;
      return `<polygon points="${starPoints({ ...layout, cx })}" fill="${layout.fill}" stroke="#a96f13" stroke-width="0.6"/>`;
    }).join("\n    ")}
  </g>`;
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

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

const logoFrameMarkup = ({ x, y, width, height, cx, cy }) => {
  const radius = 9;
  const midLeft = x - 8;
  const midRight = x + width + 8;
  const midY = cy;
  const topY = y - 5;
  const bottomY = y + height + 5;

  return `<g>
    <rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${width.toFixed(2)}" height="${height.toFixed(2)}" rx="${radius}" fill="${CERT_PAPER}" stroke="${CERT_GOLD}" stroke-width="1.6"/>
    <rect x="${(x + 3).toFixed(2)}" y="${(y + 3).toFixed(2)}" width="${(width - 6).toFixed(2)}" height="${(height - 6).toFixed(2)}" rx="${radius - 2}" fill="none" stroke="${CERT_NAVY}" stroke-width="0.8"/>
    <rect x="${(x + 5.5).toFixed(2)}" y="${(y + 5.5).toFixed(2)}" width="${(width - 11).toFixed(2)}" height="${(height - 11).toFixed(2)}" rx="${radius - 4}" fill="none" stroke="${CERT_GOLD}" stroke-width="0.8"/>
    <path d="M ${midLeft.toFixed(2)} ${midY.toFixed(2)} h -9 m 9 0 c -5 -4 -5 -9 0 -13 m 0 13 c -5 4 -5 9 0 13" fill="none" stroke="${CERT_GOLD}" stroke-width="1"/>
    <path d="M ${midRight.toFixed(2)} ${midY.toFixed(2)} h 9 m -9 0 c 5 -4 5 -9 0 -13 m 0 13 c 5 4 5 9 0 13" fill="none" stroke="${CERT_GOLD}" stroke-width="1"/>
    <path d="M ${(cx - 18).toFixed(2)} ${topY.toFixed(2)} h 12 l 6 -5 l 6 5 h 12" fill="none" stroke="${CERT_GOLD}" stroke-width="1"/>
    <path d="M ${(cx - 18).toFixed(2)} ${bottomY.toFixed(2)} h 12 l 6 5 l 6 -5 h 12" fill="none" stroke="${CERT_GOLD}" stroke-width="1"/>
  </g>`;
};

const trustLogoFrameMarkup = ({ x, y, width, height, cx, cy }) => {
  const radius = 4;
  const corner = 10;
  const left = x.toFixed(2);
  const top = y.toFixed(2);
  const right = (x + width).toFixed(2);
  const bottom = (y + height).toFixed(2);

  return `<g>
    <rect x="${left}" y="${top}" width="${width.toFixed(2)}" height="${height.toFixed(2)}" rx="${radius}" fill="${CERT_PAPER}" stroke="${CERT_GOLD}" stroke-width="1.2"/>
    <rect x="${(x + 3).toFixed(2)}" y="${(y + 3).toFixed(2)}" width="${(width - 6).toFixed(2)}" height="${(height - 6).toFixed(2)}" rx="${radius}" fill="none" stroke="${CERT_GOLD}" stroke-width="0.7"/>
    <path d="M ${left} ${(y + corner).toFixed(2)} v -${corner} h ${corner} M ${(x + width - corner).toFixed(2)} ${top} h ${corner} v ${corner} M ${right} ${(y + height - corner).toFixed(2)} v ${corner} h -${corner} M ${(x + corner).toFixed(2)} ${bottom} h -${corner} v -${corner}" fill="none" stroke="${CERT_GOLD}" stroke-width="1.4"/>
    <path d="M ${(x - 9).toFixed(2)} ${cy.toFixed(2)} c 6 -4 6 -10 0 -14 m 0 14 c 6 4 6 10 0 14 M ${(x + width + 9).toFixed(2)} ${cy.toFixed(2)} c -6 -4 -6 -10 0 -14 m 0 14 c -6 4 -6 10 0 14" fill="none" stroke="${CERT_GOLD}" stroke-width="0.9"/>
    <path d="M ${(cx - 15).toFixed(2)} ${(y - 4).toFixed(2)} h 9 l 6 -4 l 6 4 h 9 M ${(cx - 15).toFixed(2)} ${(y + height + 4).toFixed(2)} h 9 l 6 4 l 6 -4 h 9" fill="none" stroke="${CERT_GOLD}" stroke-width="0.9"/>
  </g>`;
};

const businessLogoMarkup = async (business = {}, layout) => {
  const logo = await prepareLogoImage(await resolveBusinessLogoDataUrl(business), layout);
  const drawWidth = logo?.drawWidth || Math.min(layout.maxLogoWidth, 44);
  const drawHeight = logo?.drawHeight || Math.min(layout.maxLogoHeight, 44);
  const frameWidth = clamp(drawWidth + layout.paddingX * 2, layout.minFrameWidth, layout.maxFrameWidth);
  const frameHeight = clamp(drawHeight + layout.paddingY * 2, layout.minFrameHeight, layout.maxFrameHeight);
  const frameX = layout.cx - frameWidth / 2;
  const frameY = layout.cy - frameHeight / 2;
  const logoX = layout.cx - drawWidth / 2;
  const logoY = layout.cy - drawHeight / 2;

  const fallbackInitial = escapeXml(
    String(business.businessName || business.name || "M").trim().charAt(0).toUpperCase() || "M",
  );

  const frameSvg = layout.frameStyle === "trust"
    ? trustLogoFrameMarkup({ x: frameX, y: frameY, width: frameWidth, height: frameHeight, cx: layout.cx, cy: layout.cy })
    : logoFrameMarkup({ x: frameX, y: frameY, width: frameWidth, height: frameHeight, cx: layout.cx, cy: layout.cy });

  return `${frameSvg}
  ${logo
    ? `<image href="${escapeXml(logo.dataUrl)}" x="${logoX.toFixed(2)}" y="${logoY.toFixed(2)}" width="${drawWidth.toFixed(2)}" height="${drawHeight.toFixed(2)}" preserveAspectRatio="xMidYMid meet"/>`
    : `<text x="${layout.cx}" y="${(layout.cy + 14).toFixed(2)}" text-anchor="middle" font-family="${TEXT_FONT_FAMILY}" font-size="40" font-weight="800" fill="${CERT_NAVY}">${fallbackInitial}</text>`}`;
};

// ---- main builder ------------------------------------------------------------

export const buildCertificateSvg = async (business = {}, type = "verified") => {
  const isTrust = type === "trust";
  const layout = CERTIFICATE_LAYOUTS[isTrust ? "trust" : "verified"];
  const plate = PLATES[isTrust ? "trust" : "verified"];

  const rawBusinessName = business.businessName || business.name || "Business";
  const rawLocation = business.location || business.globalAddress || "Business location verified by MassClick";
  const category = (business.category || "").trim();
  const categoryLabel = (category || (isTrust ? "TRUSTED BUSINESS" : "VERIFIED BUSINESS")).toUpperCase();
  const certNo = `MC-${isTrust ? "TRUST" : "VER"}-${(getBusinessId(business) || "000000").slice(-6).toUpperCase()}`;
  const issuedDate = formatCertificateDate(business.certificates?.generatedAt || new Date());

  const nameBlock = await fitTextBlock(rawBusinessName, layout.businessName);
  const categoryBlock = await fitTextBlock(categoryLabel, layout.category);
  const locationBlock = await fitTextBlock(rawLocation, layout.location);
  const starsSvg = starsMarkup(layout.stars);
  const logoSvg = await businessLogoMarkup(business, layout.businessLogo);
  const footerBlock = await fitTextBlock(
    `Certificate No. ${certNo}  |  Issued ${issuedDate}`,
    layout.footer,
  );

  const qr = layout.qr;
  const qrSvg = await qrMarkup({
    url: buildCertificateVerifyUrl(business),
    x: qr.x,
    y: qr.y,
    size: qr.size,
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
  ${background}

  ${starsSvg}

  ${logoSvg}

  ${textBlockMarkup({ ...layout.businessName, ...nameBlock })}

  ${textBlockMarkup({ ...layout.category, ...categoryBlock })}

  ${textBlockMarkup({ ...layout.location, ...locationBlock })}

  ${qrSvg}

  ${textBlockMarkup({ ...layout.footer, ...footerBlock })}
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
