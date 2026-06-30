const S3_BASE_URL = 'https://images.massclick.in';

export const normalizeImageUrl = (url) => {
  if (!url) return '';

  // If it's already a correct S3 URL, return as-is
  if (url.startsWith(S3_BASE_URL) && !url.includes(S3_BASE_URL + '/' + S3_BASE_URL)) {
    return url;
  }

  // If it's a relative path, prepend domain
  if (!url.startsWith('http')) {
    return `${S3_BASE_URL}/${url}`;
  }

  // If URL has domain doubled, extract the actual path and rebuild
  if (url.includes(S3_BASE_URL + '/' + S3_BASE_URL)) {
    const pathMatch = url.match(/amazonaws\.com\/(.+)$/);
    if (pathMatch) {
      const fullPath = pathMatch[1];
      // Remove duplicate domain from path
      const cleanPath = fullPath.replace(S3_BASE_URL + '/', '');
      return `${S3_BASE_URL}/${cleanPath}`;
    }
  }

  return url;
};
