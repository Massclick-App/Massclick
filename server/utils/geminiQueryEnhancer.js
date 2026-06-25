import { getCache, setCache } from "./redisClient.js";

const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent";

const CACHE_TTL = 60 * 60 * 24; // 24 hours
const TIMEOUT_MS = 2000;

// After a 429, skip Gemini for this many ms to avoid hammering the quota
let rateLimitedUntil = 0;
const RATE_LIMIT_BACKOFF_MS = 60 * 1000; // 1 minute

const buildPrompt = (term, category) => {
  const categoryHint = category ? `Category: ${category}` : "Category: general business";
  return `You are a search keyword expander for a local Indian business directory.
User searched: "${term}"
${categoryHint}

Return ONLY a space-separated list of 6 to 10 keywords (no punctuation, no explanation, no numbering).
Include the original words, synonyms, common abbreviations, and related service terms used in India.
Example output: ac repair air conditioner air conditioning cooling service technician`;
};

export const enhanceSearchQuery = async (term, category = "") => {
  if (!term) return term;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "your_gemini_api_key_here") return term;

  const cacheKey = `gemini_query:${term}:${category}`;

  try {
    const cached = await getCache(cacheKey);
    if (cached) return cached;
  } catch (_) {
    // Redis miss is fine, continue
  }

  if (Date.now() < rateLimitedUntil) {
    console.log(`[Gemini] skipping — rate limited for ${Math.ceil((rateLimitedUntil - Date.now()) / 1000)}s more`);
    return term;
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: buildPrompt(term, category) }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 80 },
      }),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!response.ok) {
      if (response.status === 429) {
        rateLimitedUntil = Date.now() + RATE_LIMIT_BACKOFF_MS;
        console.warn(`[Gemini] rate limited (429) — pausing Gemini for 60s`);
      } else {
        console.warn(`[Gemini] API error ${response.status} for term "${term}" — using original`);
      }
      return term;
    }

    const data = await response.json();
    const expanded = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!expanded) return term;

    const result = expanded.replace(/\n/g, " ").replace(/\s+/g, " ").trim();
    console.log(`[Gemini] expanded "${term}" → "${result}"`);

    await setCache(cacheKey, result, CACHE_TTL);
    return result;
  } catch (err) {
    if (err.name === "AbortError") {
      console.warn(`[Gemini] timeout for "${term}" — using original`);
    } else {
      console.warn(`[Gemini] error for "${term}": ${err.message} — using original`);
    }
    return term;
  }
};
