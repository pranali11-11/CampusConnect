/**
 * Formats a Date object or date-string into a user-friendly date string.
 * @param {string|Date} dateString - Date to format.
 * @returns {string} Formatted date (e.g. October 12, 2026).
 */
export const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

/**
 * Formats time or returns standard time string.
 * @param {string} timeString - Raw time string.
 * @returns {string} Standard format.
 */
/**
 * Formats a relative time string (e.g. "2 hours ago").
 * @param {string|Date} dateString - Date to format.
 * @returns {string} Relative time string.
 */
export const timeAgo = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';

  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
};
