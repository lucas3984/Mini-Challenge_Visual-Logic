import { setJSON, getJSON, removeItem } from './storage.js';

const STORAGE_KEY = 'lv_creator_draft';

export function saveDraft(data) {
  setJSON(STORAGE_KEY, data);
}

export function loadDraft() {
  return getJSON(STORAGE_KEY);
}

export function clearDraft() {
  removeItem(STORAGE_KEY);
}
