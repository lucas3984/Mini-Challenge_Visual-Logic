/**
 * Safe localStorage wrappers with error handling.
 *
 * All functions catch and suppress errors because localStorage can fail
 * in private browsing mode (Safari), when quota is exceeded, or if the
 * storage API is unavailable. The application must degrade gracefully
 * rather than crash when persistence is unavailable.
 *
 * The catch block for get* returns null so callers can distinguish
 * between "key not found" and "storage unavailable" uniformly.
 */

/**
 * Reads a string value from localStorage.
 *
 * @param {string} key
 * @returns {string|null} Stored value, or null on error/not found.
 */
export function getItem(key) {
  try {
    return localStorage.getItem(key);
  } catch (_) {
    // Storage unavailable (private mode, quota, or disabled API).
    return null;
  }
}

/**
 * Writes a string value to localStorage.
 *
 * Errors are silently ignored: the app continues without persistence.
 *
 * @param {string} key
 * @param {string} value
 */
export function setItem(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch (_) { /* quota exceeded or private mode — persist what we can, drop the rest */ }
}

/**
 * Removes a key from localStorage.
 *
 * @param {string} key
 */
export function removeItem(key) {
  try {
    localStorage.removeItem(key);
  } catch (_) { /* unavailable — nothing to clean up */ }
}

/**
 * Reads and parses a JSON value from localStorage.
 *
 * Returns null when the key is not found OR the stored value is not
 * valid JSON. Callers don't need separate existence checks.
 *
 * @param {string} key
 * @returns {Object|null} Parsed value, or null on error/not found.
 */
export function getJSON(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (_) {
    // Could be missing key or malformed JSON — either way, start fresh.
    return null;
  }
}

/**
 * Serializes and writes a JSON value to localStorage.
 *
 * @param {string} key
 * @param {*} value - Any JSON-serializable value.
 */
export function setJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (_) { /* quota exceeded or private mode — persist what we can, drop the rest */ }
}
