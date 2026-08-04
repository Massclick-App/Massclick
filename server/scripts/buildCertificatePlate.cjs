/*
 * Builds a certificate plate from finished certificate artwork.
 *
 * The artwork we are given is a finished certificate — it has a business name,
 * category, location, QR and certificate number already rendered into it. The
 * plate is that same artwork with those five regions painted out, so the
 * generator can draw live values into them. Everything else (border, seal,
 * laurel, verification chips, headings, logo, signature, bottom band) stays
 * exactly as designed.
 *
 * Usage:
 *   node server/scripts/buildCertificatePlate.cjs <source-artwork> <output.jpg>
 *
 * The regions below are in the source artwork's own 960x1280 coordinate space.
 * If the artwork is ever redrawn, re-check them against a row-ink profile
 * before trusting the output — and always eyeball the result.
 */

const path = require("path");
const sharp = require("sharp");

const SRC_W = 960;
const SRC_H = 1280;
const OUT_SCALE = 1.5; // 1440x1920, the certificate render size

// `flat` paints a solid colour. `sampleAt` averages a 20x20 patch of the same
// surface and paints that, which hides seams on the subtly shaded paper.
const REGIONS = [
  { name: "businessName", x: 130, y: 568, w: 700, h: 94, sampleAt: [100, 600] },
  { name: "category", x: 304, y: 676, w: 352, h: 34, flat: [3, 19, 55] },
  { name: "location", x: 300, y: 718, w: 360, h: 56, sampleAt: [700, 740] },
  // Only the modules — the white box and its gold border stay on the plate.
  { name: "qrModules", x: 108, y: 1027, w: 104, h: 108, flat: [255, 255, 255] },
  { name: "footer", x: 262, y: 1224, w: 436, h: 42, stripX: 248 },
];

const buildPatch = (region, at) => {
  const buf = Buffer.alloc(region.w * region.h * 3);

  if (region.flat) {
    for (let i = 0; i < region.w * region.h; i++) buf.set(region.flat, i * 3);
    return { buf, note: `flat ${region.flat}` };
  }

  if (region.stripX !== undefined) {
    // Stretch one clean column across the region so vertical shading survives.
    for (let row = 0; row < region.h; row++) {
      const colour = at(region.stripX, region.y + row);
      for (let col = 0; col < region.w; col++) buf.set(colour, (row * region.w + col) * 3);
    }
    return { buf, note: `column x=${region.stripX}` };
  }

  const [sx, sy] = region.sampleAt;
  const acc = [0, 0, 0];
  let n = 0;
  for (let y = sy; y < sy + 20; y++) {
    for (let x = sx; x < sx + 20; x++) {
      const p = at(x, y);
      acc[0] += p[0];
      acc[1] += p[1];
      acc[2] += p[2];
      n++;
    }
  }
  const colour = acc.map(v => Math.round(v / n));
  for (let i = 0; i < region.w * region.h; i++) buf.set(colour, i * 3);
  return { buf, note: `sampled ${colour}` };
};

const main = async () => {
  const [source, output] = process.argv.slice(2);
  if (!source || !output) {
    console.error("usage: node buildCertificatePlate.cjs <source-artwork> <output.jpg>");
    process.exit(1);
  }

  const meta = await sharp(source).metadata();
  if (meta.width !== SRC_W || meta.height !== SRC_H) {
    console.error(`source must be ${SRC_W}x${SRC_H}, got ${meta.width}x${meta.height}`);
    process.exit(1);
  }

  const { data, info } = await sharp(source).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const at = (x, y) => {
    const i = (y * info.width + x) * info.channels;
    return [data[i], data[i + 1], data[i + 2]];
  };

  const patches = REGIONS.map((region) => {
    const { buf, note } = buildPatch(region, at);
    console.log(`  ${region.name.padEnd(13)} ${note}`);
    return {
      input: buf,
      raw: { width: region.w, height: region.h, channels: 3 },
      left: region.x,
      top: region.y,
    };
  });

  // sharp applies resize before composite regardless of call order, so the
  // patches have to land in their own pass at the source resolution first.
  const patched = await sharp(source).composite(patches).png().toBuffer();
  await sharp(patched)
    .resize(Math.round(SRC_W * OUT_SCALE), Math.round(SRC_H * OUT_SCALE), { kernel: "lanczos3" })
    .jpeg({ quality: 92, chromaSubsampling: "4:4:4" })
    .toFile(output);

  const out = await sharp(output).metadata();
  console.log(`\nwrote ${path.basename(output)} — ${out.width}x${out.height} ${out.format}`);
};

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
