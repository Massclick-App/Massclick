import { getCache, setCache } from "./redisClient.js";

const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent";

const CACHE_TTL = 60 * 60 * 24; // 24 hours
const TIMEOUT_MS = 2500;

// Shared rate-limit gate — applies to all Gemini calls
let rateLimitedUntil = 0;
const RATE_LIMIT_BACKOFF_MS = 60 * 1000; // 1 minute

const isRateLimited = () => Date.now() < rateLimitedUntil;
const setRateLimit = () => { rateLimitedUntil = Date.now() + RATE_LIMIT_BACKOFF_MS; };
const rateLimitSecondsLeft = () => Math.ceil((rateLimitedUntil - Date.now()) / 1000);

const callGemini = async (prompt, maxTokens = 80) => {
  if (process.env.GEMINI_ENABLED === "false") return null;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "your_gemini_api_key_here") return null;

  if (isRateLimited()) {
    console.log(`[Gemini] skipping — rate limited for ${rateLimitSecondsLeft()}s more`);
    return null;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: maxTokens },
      }),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      const reason = body?.error?.message || JSON.stringify(body);
      if (response.status === 429) {
        setRateLimit();
        console.warn(`[Gemini] rate limited (429) — pausing 60s | reason: ${reason}`);
      } else {
        console.warn(`[Gemini] API error ${response.status} — ${reason}`);
      }
      return null;
    }

    const data = await response.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
  } catch (err) {
    clearTimeout(timer);
    if (err.name === "AbortError") {
      console.warn(`[Gemini] request timed out after ${TIMEOUT_MS}ms`);
    } else {
      console.warn(`[Gemini] fetch error: ${err.message}`);
    }
    return null;
  }
};

// ── 1. Category resolver ──────────────────────────────────────────────────────
// Picks the best matching category from your available list for a free-text term.
// Returns "" if nothing matches well enough.
export const resolveCategory = async (term, categories) => {
  if (!term || !categories?.length) return "";

  const cacheKey = `gemini_cat:${term}`;
  const cached = await getCache(cacheKey).catch(() => null);
  if (cached !== null) {
    console.log(`[Gemini] category cache hit: "${term}" → "${cached || "no match"}"`);
    return cached;
  }

  const categoryLines = categories
    .map((c) => {
      const kw = c.keywords?.slice(0, 6).join(", ");
      return kw ? `- ${c.category} (${kw})` : `- ${c.category}`;
    })
    .join("\n");

  const prompt = `You are a category matcher for a local Indian business directory.
A user searched: "${term}"

Available categories:
${categoryLines}

Pick the single best-matching category name from the list above.
Rules:
- Return ONLY the exact category name as it appears in the list — nothing else.
- If no category is a reasonable match, return exactly: NONE`;

  console.log(`[Gemini] resolving category for "${term}" against ${categories.length} options...`);
  const raw = await callGemini(prompt, 30);

  if (!raw || raw.trim().toUpperCase() === "NONE") {
    console.log(`[Gemini] no category match for "${term}"`);
    await setCache(cacheKey, "", CACHE_TTL).catch(() => {});
    return "";
  }

  const cleaned = raw.trim().replace(/^[-•*]\s*/, "");
  const match = categories.find(
    (c) => c.category.toLowerCase() === cleaned.toLowerCase()
  );
  const resolved = match?.category || "";

  if (resolved) {
    console.log(`[Gemini] category resolved: "${term}" → "${resolved}"`);
  } else {
    console.warn(`[Gemini] returned unknown category "${cleaned}" — ignoring`);
  }

  await setCache(cacheKey, resolved, CACHE_TTL).catch(() => {});
  return resolved;
};

// ── 2. Keyword expander ───────────────────────────────────────────────────────
// Expands a free-text search term with synonyms for better MongoDB text-search hits.
export const enhanceSearchQuery = async (term, category = "") => {
  if (!term) return term;

  const cacheKey = `gemini_query:${term}:${category}`;
  const cached = await getCache(cacheKey).catch(() => null);
  if (cached) {
    console.log(`[Gemini] query cache hit: "${term}" → "${cached}"`);
    return cached;
  }

  const categoryHint = category ? `Category context: ${category}` : "";
  const prompt = `You are a search keyword expander for a local Indian business directory.
User searched: "${term}"
${categoryHint}

Return ONLY a space-separated list of 6 to 10 keywords (no punctuation, no explanation, no numbering).
Include the original words, synonyms, common abbreviations, and related service terms used in India.
Example output: ac repair air conditioner air conditioning cooling service technician`;

  console.log(`[Gemini] expanding query: "${term}"...`);
  const raw = await callGemini(prompt, 80);

  if (!raw) return term;

  const result = raw.replace(/\n/g, " ").replace(/\s+/g, " ").trim();
  console.log(`[Gemini] query expanded: "${term}" → "${result}"`);

  await setCache(cacheKey, result, CACHE_TTL).catch(() => {});
  return result;
};
