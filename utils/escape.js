const MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

// Escape user supplied text before putting it into an HTML email.
export const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, (c) => MAP[c]);

// Escape user supplied text before using it inside a RegExp.
export const escapeRegex = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
