import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Certificates are rasterised server-side with sharp, whose SVG renderer
// (librsvg) resolves fonts through fontconfig and *ignores* @font-face rules
// embedded in the SVG. Left alone it picks up whatever the host OS has
// installed, so the same certificate renders with different metrics on a
// Windows dev box than on the Linux server.
//
// Pointing fontconfig at a config that exposes only our bundled fonts makes
// text rendering byte-identical everywhere. This must run before sharp is
// loaded: libvips initialises fontconfig on load, so setting these variables
// afterwards has no effect. Keep `import "./utils/fontBootstrap.js"` as the
// first import in app.js.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FONT_DIR = path.resolve(__dirname, "../assets/fonts");
const CONF_DIR = path.resolve(__dirname, "../assets/fontconfig");
const CONF_FILE = path.join(CONF_DIR, "fonts.conf");

const toFcPath = (value) => value.replace(/\\/g, "/");

const writeFontConfig = () => {
  const xml = `<?xml version="1.0"?>
<!DOCTYPE fontconfig SYSTEM "fonts.dtd">
<fontconfig>
  <dir>${toFcPath(FONT_DIR)}</dir>
  <cachedir>${toFcPath(path.join(CONF_DIR, "cache"))}</cachedir>
</fontconfig>
`;

  fs.mkdirSync(path.join(CONF_DIR, "cache"), { recursive: true });

  // Rewrite only when the content changed; the file carries absolute paths so
  // it cannot be committed, and a no-op write would bust the fontconfig cache
  // on every boot.
  const current = fs.existsSync(CONF_FILE) ? fs.readFileSync(CONF_FILE, "utf8") : "";
  if (current !== xml) {
    fs.writeFileSync(CONF_FILE, xml, "utf8");
  }
};

export const bootstrapCertificateFonts = () => {
  try {
    if (!fs.existsSync(FONT_DIR) || !fs.readdirSync(FONT_DIR).some(f => /\.(ttf|otf)$/i.test(f))) {
      console.warn(
        `[FontBootstrap] No bundled fonts in ${FONT_DIR} — certificate text will fall back to host fonts and will not be reproducible across machines.`,
      );
      return false;
    }

    writeFontConfig();
    process.env.FONTCONFIG_FILE = CONF_FILE;
    process.env.FONTCONFIG_PATH = CONF_DIR;
    return true;
  } catch (error) {
    console.warn("[FontBootstrap] Unable to configure bundled fonts:", error.message);
    return false;
  }
};

export const CERTIFICATE_FONTS_READY = bootstrapCertificateFonts();
