// Minimal, dependency-free token renderer for seoTemplates content.
//
// Two token forms:
//   {token}              -> plain substitution
//   {{#token}}...{{/token}} -> conditional block, kept only if tokens[token]
//                              is truthy, dropped (whole block) otherwise.
//
// Template authors must write each conditional block as a complete,
// self-contained clause/sentence so dropping it never leaves a dangling
// comma or broken grammar behind.

const MAX_BLOCK_ITERATIONS = 20;

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
