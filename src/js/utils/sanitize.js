/**
 * Sanitization utility
 * Prevents XSS attacks by escaping HTML special characters
 * Per AGENTS.md: mandatory for all user input
 */
export function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
