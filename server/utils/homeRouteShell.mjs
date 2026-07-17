import fs from "fs";
import path from "path";

const escapeAttribute = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

let preloadCache = {
  manifestPath: "",
  mtimeMs: -1,
  tags: "",
};

export const renderHomeRouteShell = () => `
  <div class="home-route-shell" data-home-route-shell>
    <header class="home-route-shell__header">
      <div class="home-route-shell__brand" aria-label="Massclick">
        <span class="home-route-shell__brand-mark" aria-hidden="true">M</span>
        <span class="home-route-shell__brand-name">massclick</span>
      </div>
      <div class="home-route-shell__header-actions" aria-hidden="true">
        <span class="home-route-shell__header-action"></span>
        <span class="home-route-shell__header-action"></span>
      </div>
    </header>

    <main class="home-route-shell__hero">
      <div class="home-route-shell__hero-layout">
        <div class="home-route-shell__heading">
          <h1 class="home-route-shell__title">
            Explore. Connect.<br>
            <span class="home-route-shell__title-accent">Succeed Local.</span>
          </h1>
          <p class="home-route-shell__subtitle">
            Find trusted businesses and services near you.
          </p>
        </div>

        <div class="home-route-shell__panel" aria-hidden="true">
          <div class="home-route-shell__search" aria-hidden="true">
            <span class="home-route-shell__field"></span>
            <span class="home-route-shell__field"></span>
            <span class="home-route-shell__search-button"></span>
          </div>
          <div class="home-route-shell__trust" aria-hidden="true">
            <span class="home-route-shell__trust-item"></span>
            <span class="home-route-shell__trust-item"></span>
            <span class="home-route-shell__trust-item"></span>
            <span class="home-route-shell__trust-item"></span>
          </div>
        </div>
      </div>
    </main>
  </div>
`;

export const getHomeRoutePreloadTags = (clientBuildPath) => {
  if (!clientBuildPath) return "";

  const manifestPath = path.join(clientBuildPath, "asset-manifest.json");
  if (!fs.existsSync(manifestPath)) return "";

  try {
    const mtimeMs = fs.statSync(manifestPath).mtimeMs;
    if (
      preloadCache.manifestPath === manifestPath &&
      preloadCache.mtimeMs === mtimeMs
    ) {
      return preloadCache.tags;
    }

    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    const homeCss = manifest?.files?.["home.css"];
    const homeJs = manifest?.files?.["home.js"];
    const tags = [];

    if (homeCss) {
      tags.push(
        `<link rel="preload" href="${escapeAttribute(homeCss)}" as="style" fetchpriority="high">`,
      );
    }

    if (homeJs) {
      tags.push(
        `<link rel="preload" href="${escapeAttribute(homeJs)}" as="script" fetchpriority="high">`,
      );
    }

    const result = tags.join("");
    preloadCache = {
      manifestPath,
      mtimeMs,
      tags: result,
    };
    return result;
  } catch {
    // A missing or partially written manifest must not take down page delivery.
    return "";
  }
};
