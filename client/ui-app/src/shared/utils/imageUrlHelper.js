/**
 * Single source of truth for the asset base URL on the client.
 *
 * Step 0.5 of the S3 key restructure. The bucket host used to be hardcoded in six
 * places; an env flip to a prod bucket would have left the client silently serving
 * dev images from all of them.
 *
 * The literal remains as a DEFAULT rather than a required variable, so an unset
 * REACT_APP_ASSET_BASE_URL cannot break a build. Note that CRA inlines this at build
 * time, so changing it requires a rebuild, not just a restart.
 */
export const ASSET_BASE_URL = (
  process.env.REACT_APP_ASSET_BASE_URL ||
  'https://massclickdev.s3.ap-southeast-2.amazonaws.com'
).replace(/\/+$/, '');

/** Build a public asset URL from a bare S3 key. */
export const assetUrl = (key) => (key ? `${ASSET_BASE_URL}/${String(key).replace(/^\/+/, '')}` : '');

/**
 * Collapse a value whose base URL has been prepended more than once.
 *
 * The previous implementation removed exactly ONE duplicate. Live data carries up to
 * FOUR — seopagecontentblogs.businessDetails[].bannerImage holds values shaped like
 *
 *   https://<host>/https://<host>/https://<host>/https://<host>/businessList/banners/x.jpg
 *
 * so a single pass left a still-doubled URL that resolved to nothing. This is the
 * client-side twin of the same bug fixed server-side in utils/s3KeyUtils.js (step 0.3).
 */
const collapseRepeatedHosts = (value) => {
  let current = value;
  for (let i = 0; i < 8; i += 1) {
    const stripped = current.replace(/^https?:\/\/[^/]+\//i, '');
    // Stop when what remains is the path rather than another nested URL.
    if (stripped === current || !/^https?:\/\//i.test(stripped)) return current;
    current = stripped;
  }
  return current;
};

/**
 * Normalise any stored image reference to a usable absolute URL.
 *
 * Accepts a bare key, a correct URL, or a URL with the base repeated. URLs pointing at
 * any other host are returned untouched — external images are never rewritten.
 */
export const normalizeImageUrl = (url) => {
  if (!url) return '';

  const value = String(url).trim();
  if (!value) return '';

  if (!/^https?:\/\//i.test(value)) return assetUrl(value);

  const single = collapseRepeatedHosts(value);

  let ourHost;
  try {
    ourHost = new URL(ASSET_BASE_URL).host;
  } catch {
    return single;
  }

  try {
    const parsed = new URL(single);
    if (parsed.host !== ourHost) return single; // external — leave alone
    return `${ASSET_BASE_URL}${parsed.pathname}${parsed.search}`;
  } catch {
    return single;
  }
};

export default normalizeImageUrl;
