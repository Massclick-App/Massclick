/*
 * Builds a certificate plate from finished certificate artwork.
 *
 * The artwork we are given is a finished certificate — it has a business name,
 * logo, category, location, QR and certificate number already rendered into it. The
 * plate is that same artwork with those regions painted out, so the
 * generator can draw live values into them. Everything else (border, seal,
 * laurel, verification chips, headings, signature, bottom band) stays
 * exactly as designed.
 *
 * Usage:
 *   node server/scripts/buildCertificatePlate.cjs <source-artwork> <output.jpg>
 *
 * The regions below are in the 1086x1448 reference artwork coordinate space.
 * They are scaled to the actual source image, so a same-ratio redraw at a
 * different resolution can still be cut. If the artwork is ever redrawn,
 * re-check the regions visually before trusting the output.
 */

const path = require("path");
const sharp = require("sharp");

const REF_W = 1086;
const REF_H = 1448;
const OUT_W = 1440;
const OUT_H = 1920;

// `flat` paints a solid colour. `stripX` stretches one clean column across the
// region. Otherwise the region is bridged: every row is interpolated between
// the real pixels just outside its left and right edges, which matches the
// paper's shading at the seams instead of stamping a flat patch over it.
const REGIONS = [
  { name: "businessLogo", x: 394, y: 642, w: 298, h: 202 },
  { name: "businessName", x: 254, y: 828, w: 578, h: 78 },
  { name: "category", x: 385, y: 924, w: 322, h: 42, flat: [3, 19, 55] },
  { name: "location", x: 390, y: 977, w: 306, h: 48 },
  // Only the modules — the white box and its gold border stay on the plate.
  { name: "qrModules", x: 116, y: 1199, w: 128, h: 130, flat: [255, 255, 255] },
  { name: "footer", x: 285, y: 1405, w: 520, h: 36, stripY: 1445 },
];

const scaleRegion = (region, sourceWidth, sourceHeight) => {
  const scaleX = sourceWidth / REF_W;
  const scaleY = sourceHeight / REF_H;
  const scaled = {
    ...region,
    x: Math.round(region.x * scaleX),
    y: Math.round(region.y * scaleY),
    w: Math.round(region.w * scaleX),
    h: Math.round(region.h * scaleY),
  };

  if (region.stripX !== undefined) {
    scaled.stripX = Math.round(region.stripX * scaleX);
  }
  if (region.stripY !== undefined) {
    scaled.stripY = Math.round(region.stripY * scaleY);
  }

  return scaled;
};

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

  if (region.stripY !== undefined) {
    // Stretch one clean row through the region so horizontal shading survives.
    for (let row = 0; row < region.h; row++) {
      for (let col = 0; col < region.w; col++) {
        buf.set(at(region.x + col, region.stripY), (row * region.w + col) * 3);
      }
    }
    return { buf, note: `row y=${region.stripY}` };
  }

  // Bridge: interpolate each row between the pixels just outside the region.
  // Averaging a few columns either side keeps JPEG noise from streaking.
  const GAP = 4;
  const AVG = 3;
  const edge = (x0, y) => {
    const acc = [0, 0, 0];
    for (let k = 0; k < AVG; k++) {
      const p = at(x0 + k, y);
      acc[0] += p[0];
      acc[1] += p[1];
      acc[2] += p[2];
    }
    return acc.map(v => v / AVG);
  };

  for (let row = 0; row < region.h; row++) {
    const y = region.y + row;
    const left = edge(region.x - GAP - AVG, y);
    const right = edge(region.x + region.w + GAP, y);
    for (let col = 0; col < region.w; col++) {
      const t = region.w === 1 ? 0 : col / (region.w - 1);
      const px = [
        Math.round(left[0] + (right[0] - left[0]) * t),
        Math.round(left[1] + (right[1] - left[1]) * t),
        Math.round(left[2] + (right[2] - left[2]) * t),
      ];
      buf.set(px, (row * region.w + col) * 3);
    }
  }
  return { buf, note: "bridged from both edges" };
};

const main = async () => {
  const [source, output] = process.argv.slice(2);
  if (!source || !output) {
    console.error("usage: node buildCertificatePlate.cjs <source-artwork> <output.jpg>");
    process.exit(1);
  }

  const meta = await sharp(source).metadata();
  if (Math.abs((meta.width / meta.height) - (REF_W / REF_H)) > 0.001) {
    console.error(`source must use the ${REF_W}:${REF_H} certificate ratio, got ${meta.width}x${meta.height}`);
    process.exit(1);
  }

  const { data, info } = await sharp(source).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const at = (x, y) => {
    const i = (y * info.width + x) * info.channels;
    return [data[i], data[i + 1], data[i + 2]];
  };

  const patches = REGIONS.map((referenceRegion) => {
    const region = scaleRegion(referenceRegion, meta.width, meta.height);
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
    .resize(OUT_W, OUT_H, { kernel: "lanczos3" })
    .jpeg({ quality: 92, chromaSubsampling: "4:4:4" })
    .toFile(output);

  const out = await sharp(output).metadata();
  console.log(`\nwrote ${path.basename(output)} — ${out.width}x${out.height} ${out.format}`);
};

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
