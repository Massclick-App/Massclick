import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

// Certificates are rasterised with sharp, whose SVG renderer (librsvg) resolves
// fonts through fontconfig. Left to the host OS it picks up whatever happens to
// be installed, so a certificate rendered on a Windows dev box and one rendered
// on the Linux server come out with different metrics.
//
// assets/fontconfig/fonts.conf pins that down to the fonts we bundle, but it
// only takes effect if FONTCONFIG_FILE is in the environment *before the
// process starts* — fontconfig reads its environment during library load, so
// assigning process.env here would be too late to matter. This module therefore
// verifies rather than configures: it renders two families that look nothing
// alike and checks they actually came out different.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONF_FILE = path.resolve(__dirname, "../assets/fontconfig/fonts.conf");
const FONT_DIR = path.resolve(__dirname, "../assets/fonts");

const probeSvg = (family) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="120">
    <rect width="600" height="120" fill="#fff"/>
    <text x="10" y="80" font-family="${family}" font-size="48" fill="#000">Massclick</text>
  </svg>`;

const inkSignature = async (family) => {
  const { data } = await sharp(Buffer.from(probeSvg(family)), { density: 96 })
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  let ink = 0;
  for (let i = 0; i < data.length; i++) if (data[i] < 128) ink++;
  return ink;
};

const explainFix = () => {
  console.warn(
    "[FontBootstrap] Certificate text will render in a fallback font and will " +
      "not match the design.\n" +
      `  Set FONTCONFIG_FILE=${CONF_FILE} in the environment before starting node.\n` +
      "  It must be set by the shell or process manager — setting it in JS is too late.",
  );
};

// Resolved by whoever needs to know; awaiting it is optional.
export const certificateFontsReady = (async () => {
  try {
    if (!fs.existsSync(FONT_DIR) || !fs.readdirSync(FONT_DIR).some(f => /\.(ttf|otf)$/i.test(f))) {
      console.warn(`[FontBootstrap] No bundled fonts in ${FONT_DIR}.`);
      return false;
    }

    if (!process.env.FONTCONFIG_FILE) {
      console.warn("[FontBootstrap] FONTCONFIG_FILE is not set.");
      explainFix();
      return false;
    }

    // A serif and a sans that resolve to the same glyphs mean neither resolved.
    const [sans, serif] = await Promise.all([
      inkSignature("Noto Sans"),
      inkSignature("Noto Serif"),
    ]);

    if (sans === serif) {
      console.warn("[FontBootstrap] Bundled fonts are not being resolved by fontconfig.");
      explainFix();
      return false;
    }

    console.log("[FontBootstrap] Certificate fonts resolved via", process.env.FONTCONFIG_FILE);
    return true;
  } catch (error) {
    console.warn("[FontBootstrap] Font verification failed:", error.message);
    return false;
  }
})();
