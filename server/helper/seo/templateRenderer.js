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

// A URL copied from a browser arrives percent-encoded, so a token written
// inside a link href reaches us as ".../%7Blocation%7D/..." rather than
// ".../{location}/...". The token regexes below only match raw braces, so
// those tokens used to survive rendering untouched and ship to the live page
// as literal "%7Blocation%7D". Rewrite encoded token syntax back to raw
// syntax first. Deliberately matched as complete token patterns rather than
// decoding every %7B/%7D, so an unrelated encoded brace in content is left
// alone. Block patterns run first since they enclose the plain pattern.
const normalizeEncodedTokens = (str) =>
  str
    .replace(/%7B%7B(?:%23|#)(\w+)%7D%7D/gi, (_match, tokenName) => `{{#${tokenName}}}`)
    .replace(/%7B%7B(?:%2F|\/)(\w+)%7D%7D/gi, (_match, tokenName) => `{{/${tokenName}}}`)
    .replace(/%7B(\w+)%7D/gi, (_match, tokenName) => `{${tokenName}}`);

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

  const normalized = normalizeEncodedTokens(str);
  const withoutBlocks = stripConditionalBlocks(normalized, tokens);
  const substituted = substitutePlainTokens(withoutBlocks, tokens);

  return cleanupWhitespace(substituted);
};

// Builds one tableTemplate entry into HTML, running every cell through the
// normal renderer so cells support the same tokens and conditional blocks as
// the rest of a template. Emits no class names — the consuming pages style
// raw injected HTML by element selector under their own .seo-page-content,
// and a CSS Module class would be hashed and never match. The wrapper carries
// a data attribute instead, which survives both hashing and sanitizing.
export const renderTableTemplate = (table = {}, tokens = {}) => {
  const rows = (table?.rows || [])
    .map((row) => (Array.isArray(row?.cells) ? row.cells : []))
    .filter((cells) => cells.some((cell) => String(cell ?? "").trim() !== ""));

  if (rows.length === 0) return "";

  // Rows can be ragged if columns were added or removed unevenly; pad every
  // row out to the widest so the grid stays rectangular.
  const width = rows.reduce((max, cells) => Math.max(max, cells.length), 0);
  const padded = rows.map((cells) =>
    cells.length === width
      ? cells
      : [...cells, ...Array.from({ length: width - cells.length }, () => "")]
  );

  const renderRow = (cells, tag) =>
    `<tr>${cells
      .map((cell) => `<${tag}>${renderTemplateString(cell, tokens)}</${tag}>`)
      .join("")}</tr>`;

  const hasHeaderRow = table.hasHeaderRow !== false;
  const head = hasHeaderRow ? `<thead>${renderRow(padded[0], "th")}</thead>` : "";
  const bodyRows = hasHeaderRow ? padded.slice(1) : padded;
  const body = bodyRows.length
    ? `<tbody>${bodyRows.map((cells) => renderRow(cells, "td")).join("")}</tbody>`
    : "";
  const caption = table.caption
    ? `<caption>${renderTemplateString(table.caption, tokens)}</caption>`
    : "";

  return `<div data-seo-table><table>${caption}${head}${body}</table></div>`;
};

// Maps tableTemplate entries onto the {table1}, {table2}, … tokens the body
// references, with {table} as an alias for the first. Cells are rendered
// against `tokens` here, before injection, because substitution is a single
// pass — a token inside an already-substituted value is never rescanned.
export const buildTableTokens = (tableTemplate = [], tokens = {}) => {
  const tableTokens = {};

  (tableTemplate || []).forEach((table, index) => {
    const html = renderTableTemplate(table, tokens);
    tableTokens[`table${index + 1}`] = html;
    if (index === 0) tableTokens.table = html;
  });

  return tableTokens;
};

export const renderFaqTemplate = (faqTemplate = [], tokens = {}) =>
  faqTemplate.map((item) => ({
    question: renderTemplateString(item.question, tokens),
    answer: renderTemplateString(item.answer, tokens),
  }));
