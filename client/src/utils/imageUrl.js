/**
 * Resolve local and cloud image URLs to full valid URLs for frontend display.
 * @param {string} url - Relative or absolute image path.
 * @returns {string|null} Resolved image URL.
 */
export const resolveImageUrl = (url) => {
  if (!url) return null;

  if (
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("data:") ||
    url.startsWith("blob:")
  ) {
    return url;
  }

  // Normalize Windows backslashes
  const normalized = url.replace(/\\/g, "/");
  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
  const backendBase = apiUrl.replace(/\/api\/?$/, "");

  const uploadsIndex = normalized.toLowerCase().lastIndexOf("/uploads/");
  if (uploadsIndex !== -1) {
    const relativePath = normalized.substring(uploadsIndex); // e.g. /uploads/filename.png
    return `${backendBase}${relativePath}`;
  }

  if (normalized.startsWith("uploads/")) {
    return `${backendBase}/${normalized}`;
  }

  if (normalized.startsWith("/uploads/")) {
    return `${backendBase}${normalized}`;
  }

  return url;
};
