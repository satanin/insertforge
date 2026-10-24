import { browser } from '$app/environment';

export type InterfaceMode = 'classic' | 'modern';
export const INTERFACE_STORAGE_KEY = 'insertforge-interface';

// A browser preference, deliberately separate from project data and exports.
export const interfaceUi = $state({ mode: 'modern' as InterfaceMode, projectOpen: true });

export function loadInterfacePreference() {
  if (!browser) return;
  try {
    interfaceUi.mode = localStorage.getItem(INTERFACE_STORAGE_KEY) === 'classic' ? 'classic' : 'modern';
  } catch {
    interfaceUi.mode = 'modern';
  }
}

export function setInterfaceMode(mode: InterfaceMode) {
  interfaceUi.mode = mode;
  if (!browser) return;
  try {
    localStorage.setItem(INTERFACE_STORAGE_KEY, mode);
  } catch {
    // The interface still works when browser storage is unavailable.
  }
}
