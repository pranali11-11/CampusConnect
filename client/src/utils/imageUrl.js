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

  if (url.startsWith("/uploads/") || url.startsWith("uploads/")) {
    const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
    const backendBase = apiUrl.replace(/\/api\/?$/, "");
    return `${backendBase}${url.startsWith("/") ? url : `/${url}`}`;
  }

  return url;
};
