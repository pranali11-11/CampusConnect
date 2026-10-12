export const formatDescription = (description = '') => String(description)
  .replace(/\*\*(.*?)\*\*/g, '$1')
  .replace(/^\s*#{1,6}\s+/gm, '')
  .replace(/^\s*[-*]\s+/gm, '• ')
  .replace(/\r\n/g, '\n')
  .trim();
