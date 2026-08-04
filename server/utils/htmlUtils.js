export const escapeHtml = (value = "") => String(value)
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/\"/g, "&quot;")
  .replace(/'/g, "&#39;");

export const slugToText = (value = "") => value.replace(/-/g, " ").trim();
export const titleCase = (value = "") => value.replace(/\b\w/g, s => s.toUpperCase());

export const formatDisplayDate = (value) => {
  if (!value) return "";
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) return "";
  return parsedDate.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

export const sanitizeHtmlFragment = (value = "") => String(value)
  .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
  .replace(/\son\w+="[^"]*"/gi, "")
  .replace(/\son\w+='[^']*'/gi, "");

export const demoteH1Tags = (value = "") => String(value)
  .replace(/<h1(\s[^>]*)?>/gi, "<h2>")
  .replace(/<\/h1>/gi, "</h2>");

// Takes { name, url } items — the same shape as the client's
// generateBreadcrumbSchema (client/ui-app/src/utils/seoSchemaGenerators.js).
// The two used to disagree (this one read item.item, the client item.url) for
// what was otherwise byte-identical output; converged onto `url` since that's
// the more common convention and matches breadcrumbBuilder.js's crumbsToJsonLd.
export const buildBreadcrumbSchema = (items = []) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: items.map((item, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: item.name,
    item: item.url
  }))
});
