/**
 * Keyword Suggestion Helper
 * Uses Google Autocomplete to generate real SEO keywords
 * based on what people actually search for
 */

import axios from 'axios';

const GOOGLE_SUGGEST_URL = 'https://suggestqueries.google.com/complete/search';

/**
 * Fetch Google autocomplete suggestions for a query
 */
const fetchGoogleSuggestions = async (query) => {
  try {
    const response = await axios.get(GOOGLE_SUGGEST_URL, {
      params: {
        client: 'firefox',
        q: query,
        hl: 'en',
        gl: 'in',        // India
        cr: 'countryIN', // India results
      },
      timeout: 4000,
    });

    // Response format: ["query", ["suggestion1", "suggestion2", ...], ...]
    const suggestions = response.data[1] || [];
    return suggestions.filter(s => typeof s === 'string');
  } catch {
    return [];
  }
};

/**
 * Clean and filter a keyword for quality
 * Returns null if the keyword should be rejected
 */
const cleanKeyword = (raw) => {
  const kw = raw.trim().toLowerCase()
    .replace(/[^a-z0-9\s\-&'()]/g, '') // strip special chars
    .replace(/\s+/g, ' ')               // collapse spaces
    .trim();

  if (!kw) return null;
  if (kw.split(' ').length < 2) return null;      // reject single words
  if (kw.length < 5 || kw.length > 80) return null;

  // Reject navigational / useless patterns
  const SKIP = ['wikipedia', 'youtube', 'amazon', 'flipkart', 'login',
                 'register', 'app', 'download', 'free', 'online course',
                 'jobs', 'salary', 'government', 'exam', 'result'];
  if (SKIP.some(s => kw.includes(s))) return null;

  return kw;
};

/**
 * Generate SEO keyword suggestions for a category
 * @param {string} categoryName - e.g. "AC Repair Service"
 * @returns {string[]} - array of clean keyword suggestions
 */
export const suggestKeywordsForCategory = async (categoryName) => {
  const base = categoryName.trim().toLowerCase();

  // Query variations — broad to local
  const queries = [
    base,
    `${base} service`,
    `${base} near me`,
    `${base} in trichy`,
    `${base} in tamil nadu`,
    `best ${base}`,
  ];

  // Fetch all in parallel
  const results = await Promise.all(queries.map(fetchGoogleSuggestions));

  // Flatten, clean, deduplicate
  const seen = new Set();
  const keywords = [];

  for (const batch of results) {
    for (const raw of batch) {
      const kw = cleanKeyword(raw);
      if (!kw) continue;
      if (seen.has(kw)) continue;

      // Skip if it's just the base query itself
      if (kw === base) continue;

      seen.add(kw);
      keywords.push(kw);

      if (keywords.length >= 25) break; // cap at 25 suggestions
    }
    if (keywords.length >= 25) break;
  }

  return keywords;
};
