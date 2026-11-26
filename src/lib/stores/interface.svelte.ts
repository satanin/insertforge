import { browser } from '$app/environment';

export type InterfaceMode = 'classic' | 'modern';
export type InterfaceDensity = 'balanced' | 'compact';
export const INTERFACE_STORAGE_KEY = 'insertforge-interface';
export const DENSITY_STORAGE_KEY = 'insertforge-density';

// A browser preference, deliberately separate from project data and exports.
export const interfaceUi = $state({ mode: 'modern' as InterfaceMode, density: 'balanced' as InterfaceDensity, projectOpen: true });

export function loadInterfacePreference() {
  if (!browser) return;
  try {
    interfaceUi.mode = localStorage.getItem(INTERFACE_STORAGE_KEY) === 'classic' ? 'classic' : 'modern';
    interfaceUi.density = localStorage.getItem(DENSITY_STORAGE_KEY) === 'compact' ? 'compact' : 'balanced';
  } catch {
    interfaceUi.mode = 'modern';
    interfaceUi.density = 'balanced';
  }
}

export function setInterfaceDensity(density: InterfaceDensity) {
  interfaceUi.density = density;
  if (!browser) return;
  try { localStorage.setItem(DENSITY_STORAGE_KEY, density); } catch { /* Preference still works without storage. */ }
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
