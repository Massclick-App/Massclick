// Pure, dependency-free helpers for the SEO Templates admin page.
//
// checkBlockBalance is ported from server/scripts/importSeoTemplates.js so
// the same {{#zone1}}...{{/zone1}} balance rule the bulk importer enforces
// is also enforced here, client-side, before a save request ever reaches
// the server (which does not itself validate token balance).
//
// renderTemplateString / renderFaqTemplate are ported from
// server/helper/seo/templateRenderer.js so the admin can preview exactly
// what the live site would render, without a round-trip to the server.

const MAX_BLOCK_ITERATIONS = 20;

// Checks every {{#token}} has a matching {{/token}} across all template
// string fields on the entry (including faqTemplate question/answer).
export const checkBlockBalance = (entry = {}) => {
  const errors = [];
  const stringsToCheck = [
    ["titleTemplate", entry.titleTemplate],
    ["descriptionTemplate", entry.descriptionTemplate],
    ["keywordsTemplate", entry.keywordsTemplate],
    ["headerTemplate", entry.headerTemplate],
    ["bodyTemplate", entry.bodyTemplate],
    ...(Array.isArray(entry.faqTemplate)
      ? entry.faqTemplate.flatMap((item, i) => [
          [`faqTemplate[${i}].question`, item?.question],
          [`faqTemplate[${i}].answer`, item?.answer],
        ])
      : []),
  ];

  for (const [fieldName, value] of stringsToCheck) {
    if (typeof value !== "string") continue;

    const openTags = [...value.matchAll(/\{\{#(\w+)\}\}/g)].map((m) => m[1]);
    const closeTags = [...value.matchAll(/\{\{\/(\w+)\}\}/g)].map((m) => m[1]);

    const openCounts = {};
    openTags.forEach((t) => (openCounts[t] = (openCounts[t] || 0) + 1));
    const closeCounts = {};
    closeTags.forEach((t) => (closeCounts[t] = (closeCounts[t] || 0) + 1));

    const allTags = new Set([...openTags, ...closeTags]);
    for (const tag of allTags) {
      if ((openCounts[tag] || 0) !== (closeCounts[tag] || 0)) {
        errors.push(`${fieldName}: unbalanced {{#${tag}}}/{{/${tag}}} block`);
      }
    }
  }

  return errors;
};

const stripConditionalBlocks = (str, tokens) => {
  let result = str;
  let iterations = 0;
  const blockPattern = /\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/;

  while (blockPattern.test(result) && iterations < MAX_BLOCK_ITERATIONS) {
    result = result.replace(blockPattern, (_match, tokenName, inner) =>
      tokens?.[tokenName] ? inner : ""
    );
    iterations += 1;
  }

  // Safety net: strip any leftover block markers from a malformed/over-nested
  // template rather than leaking raw {{#...}}/{{/...}} into rendered output.
  return result.replace(/\{\{\/?#?\w+\}\}/g, "");
};

const substitutePlainTokens = (str, tokens) =>
  str.replace(/\{(\w+)\}/g, (_match, tokenName) => tokens?.[tokenName] ?? "");

const cleanupWhitespace = (str) =>
  str
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([.,!?])/g, "$1")
    .trim();

export const renderTemplateString = (str, tokens = {}) => {
  if (!str) return "";

  const withoutBlocks = stripConditionalBlocks(str, tokens);
  const substituted = substitutePlainTokens(withoutBlocks, tokens);

  return cleanupWhitespace(substituted);
};

export const renderFaqTemplate = (faqTemplate = [], tokens = {}) =>
  faqTemplate.map((item) => ({
    question: renderTemplateString(item.question, tokens),
    answer: renderTemplateString(item.answer, tokens),
  }));

// Sample token sets used by the live-preview panel, so admins can see both
// render paths (with zone data present, and with it absent) before saving.
export const PREVIEW_TOKENS_WITH_ZONES = {
  category: "Restaurants",
  location: "Trichy",
  locality: null,
  zone1: "Cantonment",
  zone2: "Thillai Nagar",
};

export const PREVIEW_TOKENS_WITHOUT_ZONES = {
  category: "Restaurants",
  location: "Trichy",
  locality: null,
  zone1: null,
  zone2: null,
};
