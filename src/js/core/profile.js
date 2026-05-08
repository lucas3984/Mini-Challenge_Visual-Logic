/**
 * Profile management module.
 *
 * Stores profiles as a simple list of unique names in localStorage via the
 * existing safe wrappers (storage.js). Two storage keys are used:
 *
 *   lv_profiles       — JSON array of profile name strings
 *   lv_active_profile — plain string of the currently active profile name
 *
 * The withProfile() helper scopes any storage key under the active profile,
 * so progress, workspaces, and other per-user data remain isolated when the
 * profile dropdown is added later.
 */
import { getJSON, setJSON, getItem, setItem } from './storage.js';

const PROFILES_KEY = 'lv_profiles';
const ACTIVE_KEY = 'lv_active_profile';

const MAX_NAME_LENGTH = 30;
const MIN_NAME_LENGTH = 1;

/**
 * Returns all saved profile names (trimmed, as stored).
 * @returns {string[]}
 */
export function getAllProfiles() {
  return getJSON(PROFILES_KEY) || [];
}

/**
 * Saves the full profile list back to localStorage.
 * @param {string[]} profiles
 */
function saveProfiles(profiles) {
  setJSON(PROFILES_KEY, profiles);
}

/**
 * Validates a profile name against project rules.
 *
 * Rules:
 *   - Must be non-empty after trimming
 *   - Must be between MIN_NAME_LENGTH and MAX_NAME_LENGTH characters
 *   - Must be unique among existing profiles (case-insensitive)
 *
 * @param {string} name
 * @returns {{ valid: true } | { valid: false, error: string }}
 */
export function validateProfileName(name) {
  const trimmed = (name || '').trim();

  if (trimmed.length < MIN_NAME_LENGTH) {
    return { valid: false, error: 'O nome não pode ficar vazio.' };
  }

  if (trimmed.length > MAX_NAME_LENGTH) {
    return { valid: false, error: `O nome deve ter no máximo ${MAX_NAME_LENGTH} caracteres.` };
  }

  // Check uniqueness (case-insensitive)
  const existing = getAllProfiles();
  const isDuplicate = existing.some(
    (p) => p.toLowerCase() === trimmed.toLowerCase()
  );

  if (isDuplicate) {
    return { valid: false, error: 'Este nome já está em uso. Escolha outro.' };
  }

  return { valid: true };
}

/**
 * Creates a new profile with the given name.
 *
 * Name is trimmed before saving. Returns an error result if validation fails
 * or if the name already exists (race-condition safe within the same session).
 *
 * @param {string} name
 * @returns {{ ok: true } | { ok: false, error: string }}
 */
export function createProfile(name) {
  const validation = validateProfileName(name);
  if (!validation.valid) {
    return validation;
  }

  const trimmed = name.trim();
  const profiles = getAllProfiles();
  profiles.push(trimmed);
  saveProfiles(profiles);

  return { ok: true };
}

/**
 * Removes a profile by name (case-insensitive match).
 * If the removed profile was the active one, clears the active profile.
 *
 * @param {string} name
 */
export function deleteProfile(name) {
  const trimmed = (name || '').trim();
  if (!trimmed) return;

  const profiles = getAllProfiles();
  const filtered = profiles.filter(
    (p) => p.toLowerCase() !== trimmed.toLowerCase()
  );

  if (filtered.length !== profiles.length) {
    saveProfiles(filtered);

    // Clear active profile if it was the deleted one
    const active = getActiveProfile();
    if (active && active.toLowerCase() === trimmed.toLowerCase()) {
      removeActiveProfile();
    }
  }
}

/**
 * Returns the currently active profile name, or null if none is set.
 * @returns {string|null}
 */
export function getActiveProfile() {
  return getItem(ACTIVE_KEY);
}

/**
 * Sets the active profile. Does NOT validate that the profile exists
 * in the profiles list — callers should ensure consistency.
 *
 * @param {string} name
 */
export function setActiveProfile(name) {
  const trimmed = (name || '').trim();
  if (trimmed) {
    setItem(ACTIVE_KEY, trimmed);
  }
}

/**
 * Clears the active profile (e.g. when the active profile is deleted).
 */
export function removeActiveProfile() {
  try {
    localStorage.removeItem(ACTIVE_KEY);
  } catch (_) { /* unavailable — fine to ignore */ }
}

/**
 * Returns true if at least one profile exists.
 * @returns {boolean}
 */
export function hasAnyProfile() {
  return getAllProfiles().length > 0;
}

/**
 * Scopes a base storage key under the active profile name.
 *
 * Example:
 *   withProfile('snake-progress')      → 'snake-progress_Testador'
 *   withProfile('snake-workspace-0')   → 'snake-workspace-0_Testador'
 *
 * Returns the base key unchanged if no active profile is set (graceful
 * fallback for environments where profiles aren't used yet).
 *
 * @param {string} baseKey
 * @returns {string}
 */
export function withProfile(baseKey) {
  const profile = getActiveProfile();
  return profile ? `${baseKey}_${profile}` : baseKey;
}
