import QRCode from "qrcode";

/**
 * Builds a 1080x1350 (4:5, the size WhatsApp status / Instagram feed show
 * uncropped) PNG share card for a business: photo, logo, name, category,
 * area, rating, verified badge and a QR code back to the listing.
 *
 * Photos come from S3; if the bucket doesn't allow a CORS read the canvas
 * would be tainted and toBlob() would throw, so every remote image is loaded
 * with crossOrigin and simply left out if it can't be used.
 */
const WIDTH = 1080;
const HEIGHT = 1350;
const PHOTO_HEIGHT = 720;
const BRAND = "#ff6a00";
const INK = "#0b1b3f";
const MUTED = "#5b6b86";
const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif';

const loadImage = (src, timeoutMs = 6000) =>
  new Promise((resolve) => {
    if (!src) return resolve(null);
    const img = new Image();
    const timer = setTimeout(() => resolve(null), timeoutMs);
    img.crossOrigin = "anonymous";
    img.decoding = "async";
    img.onload = () => { clearTimeout(timer); resolve(img); };
    img.onerror = () => { clearTimeout(timer); resolve(null); };
    img.src = src;
  });

// An image can load yet still taint the canvas (no CORS header); probe it on
// a 1px canvas so one bad photo can't break the whole card.
const isCanvasSafe = (img) => {
  try {
    const probe = document.createElement("canvas");
    probe.width = 1;
    probe.height = 1;
    const ctx = probe.getContext("2d");
    ctx.drawImage(img, 0, 0, 1, 1);
    ctx.getImageData(0, 0, 1, 1);
    return true;
  } catch {
    return false;
  }
};

const drawCover = (ctx, img, x, y, w, h) => {
  const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const sw = w / scale;
  const sh = h / scale;
  const sx = (img.naturalWidth - sw) / 2;
  const sy = (img.naturalHeight - sh) / 2;
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
};

const roundRect = (ctx, x, y, w, h, r) => {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
};

const wrapLines = (ctx, text, maxWidth, maxLines) => {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width <= maxWidth) {
      line = next;
      continue;
    }
    if (line) lines.push(line);
    line = word;
    if (lines.length === maxLines) break;
  }
  if (line && lines.length < maxLines) lines.push(line);
  if (lines.length === maxLines && words.join(" ") !== lines.join(" ")) {
    let last = lines[maxLines - 1];
    while (last && ctx.measureText(`${last}…`).width > maxWidth) last = last.slice(0, -1);
    lines[maxLines - 1] = `${last.trimEnd()}…`;
  }
  return lines;
};

const initialsOf = (name = "") =>
  String(name).split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "MC";

export const createBusinessShareImage = async ({
  name,
  category,
  area,
  rating,
  reviews,
  verified,
  imageSrc,
  logoSrc,
  url,
}) => {
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext("2d");

  const [photoRaw, logoRaw] = await Promise.all([loadImage(imageSrc), loadImage(logoSrc)]);
  const photo = photoRaw && isCanvasSafe(photoRaw) ? photoRaw : null;
  const logo = logoRaw && isCanvasSafe(logoRaw) ? logoRaw : null;

  // Photo band (or a branded gradient when there's no usable photo)
  if (photo) {
    drawCover(ctx, photo, 0, 0, WIDTH, PHOTO_HEIGHT);
  } else {
    const g = ctx.createLinearGradient(0, 0, WIDTH, PHOTO_HEIGHT);
    g.addColorStop(0, "#0b1f4d");
    g.addColorStop(1, "#16357a");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, WIDTH, PHOTO_HEIGHT);
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.font = `800 360px ${FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(initialsOf(name), WIDTH / 2, PHOTO_HEIGHT / 2);
  }
  const shade = ctx.createLinearGradient(0, PHOTO_HEIGHT - 260, 0, PHOTO_HEIGHT);
  shade.addColorStop(0, "rgba(6,16,40,0)");
  shade.addColorStop(1, "rgba(6,16,40,0.55)");
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, WIDTH, PHOTO_HEIGHT);

  // Brand chip on the photo
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.font = `800 34px ${FONT}`;
  const chipText = "massclick";
  const chipW = ctx.measureText(chipText).width + 56;
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  roundRect(ctx, 56, 52, chipW, 64, 32);
  ctx.fill();
  ctx.fillStyle = BRAND;
  ctx.fillText(chipText, 84, 85);

  // Info panel
  const panelTop = PHOTO_HEIGHT - 70;
  ctx.fillStyle = "#ffffff";
  roundRect(ctx, 0, panelTop, WIDTH, HEIGHT - panelTop + 60, 56);
  ctx.fill();

  // Logo / initials medallion overlapping the photo
  const logoSize = 168;
  const logoX = 72;
  const logoY = panelTop - logoSize / 2;
  ctx.save();
  ctx.shadowColor = "rgba(8,20,48,0.25)";
  ctx.shadowBlur = 24;
  ctx.fillStyle = "#ffffff";
  roundRect(ctx, logoX - 8, logoY - 8, logoSize + 16, logoSize + 16, 44);
  ctx.fill();
  ctx.restore();
  ctx.save();
  roundRect(ctx, logoX, logoY, logoSize, logoSize, 38);
  ctx.clip();
  if (logo) {
    drawCover(ctx, logo, logoX, logoY, logoSize, logoSize);
  } else {
    const lg = ctx.createLinearGradient(logoX, logoY, logoX + logoSize, logoY + logoSize);
    lg.addColorStop(0, "#ff7a1a");
    lg.addColorStop(1, "#ff4d0a");
    ctx.fillStyle = lg;
    ctx.fillRect(logoX, logoY, logoSize, logoSize);
    ctx.fillStyle = "#ffffff";
    ctx.font = `800 70px ${FONT}`;
    ctx.textAlign = "center";
    ctx.fillText(initialsOf(name), logoX + logoSize / 2, logoY + logoSize / 2 + 2);
  }
  ctx.restore();

  // Verified badge
  if (verified) {
    ctx.font = `700 30px ${FONT}`;
    ctx.textAlign = "left";
    const label = "✓ Verified on Massclick";
    const bw = ctx.measureText(label).width + 48;
    const bx = WIDTH - 72 - bw;
    ctx.fillStyle = "#e8f7ee";
    roundRect(ctx, bx, panelTop + 40, bw, 58, 29);
    ctx.fill();
    ctx.fillStyle = "#0f8a4b";
    ctx.fillText(label, bx + 24, panelTop + 70);
  }

  // Name, category · area, rating
  let y = panelTop + 150;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = INK;
  ctx.font = `800 66px ${FONT}`;
  for (const line of wrapLines(ctx, name, WIDTH - 144, 2)) {
    ctx.fillText(line, 72, y);
    y += 78;
  }
  const meta = [category, area].filter(Boolean).join("  ·  ");
  if (meta) {
    ctx.fillStyle = MUTED;
    ctx.font = `600 36px ${FONT}`;
    for (const line of wrapLines(ctx, meta, WIDTH - 144, 2)) {
      ctx.fillText(line, 72, y + 4);
      y += 50;
    }
  }
  if (Number(rating) > 0) {
    y += 16;
    ctx.font = `800 38px ${FONT}`;
    ctx.fillStyle = "#f59e0b";
    ctx.fillText("★", 72, y);
    ctx.fillStyle = INK;
    const r = Number(rating).toFixed(1);
    ctx.fillText(r, 116, y);
    if (Number(reviews) > 0) {
      const rw = ctx.measureText(r).width;
      ctx.fillStyle = MUTED;
      ctx.font = `600 32px ${FONT}`;
      ctx.fillText(`· ${reviews} rating${Number(reviews) === 1 ? "" : "s"}`, 128 + rw, y);
    }
  }

  // Footer: QR + call to action
  const qrSize = 220;
  const qrX = WIDTH - 72 - qrSize;
  const qrY = HEIGHT - 72 - qrSize;
  const qrCanvas = document.createElement("canvas");
  await QRCode.toCanvas(qrCanvas, url, { width: qrSize, margin: 1, color: { dark: INK, light: "#ffffff" } });
  ctx.fillStyle = "#f4f6fb";
  roundRect(ctx, 56, qrY - 16, WIDTH - 112, qrSize + 32, 32);
  ctx.fill();
  ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize);
  ctx.fillStyle = INK;
  ctx.font = `800 40px ${FONT}`;
  ctx.fillText("Scan to view details,", 96, qrY + 70);
  ctx.fillText("call or get directions", 96, qrY + 122);
  ctx.fillStyle = BRAND;
  ctx.font = `700 32px ${FONT}`;
  ctx.fillText("massclick.in", 96, qrY + 182);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Could not create image"))), "image/png");
  });
};

export default createBusinessShareImage;
