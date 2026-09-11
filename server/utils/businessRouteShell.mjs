// Pre-React business hero; class names shared with BusinessRouteFallback.js, critical CSS in client public/index.html.

const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const toTitleCase = (value = "") =>
  String(value).trim().replace(/\b\w/g, (c) => c.toUpperCase());

export const buildBusinessRouteShellMeta = ({ rating, category, area } = {}) => {
  const parts = [];
  const score = Number(rating);
  if (Number.isFinite(score) && score > 0) parts.push(`★ ${score.toFixed(1)}`);
  if (category) parts.push(toTitleCase(category));
  if (area) parts.push(String(area).trim());
  return parts.filter(Boolean).join(" · ");
};

// Mirrors cardDetails' galleryDisplayImages.length === 1 hero (contained photo over a blurred copy).
export const renderBusinessRouteShell = ({ name = "", imageUrl = "", meta = "", layout = "multi" } = {}) => {
  const single = layout === "single";
  const src = escapeHtml(imageUrl);
  const media = !imageUrl
    ? ""
    : single
      ? `<img class="biz-route-shell__backdrop" src="${src}" alt=""><img class="biz-route-shell__image" src="${src}" alt="" width="1200" height="600" fetchpriority="high">`
      : `<img class="biz-route-shell__image" src="${src}" alt="" width="1200" height="600" fetchpriority="high">`;
  return `
  <div class="biz-route-shell${single ? " biz-route-shell--single" : ""}" data-business-route-shell aria-hidden="true">
    <div class="biz-route-shell__bar"></div>
    <div class="biz-route-shell__page">
      <div class="biz-route-shell__crumbs"></div>
      <div class="biz-route-shell__media">${media}</div>
      <p class="biz-route-shell__name">${escapeHtml(name)}</p>
      ${meta ? `<p class="biz-route-shell__meta">${escapeHtml(meta)}</p>` : ""}
    </div>
  </div>
`;
};
