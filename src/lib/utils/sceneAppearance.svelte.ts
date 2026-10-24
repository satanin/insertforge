import { interfaceUi } from '$lib/stores/interface.svelte';
import { mode } from 'mode-watcher';

// Presentation only: no changes to meshes, coordinates, lighting or camera framing.
export function getSceneAppearance() {
  if (interfaceUi.mode === 'classic')
    return {
      grid: '#2a2a2a',
      section: '#5a3530',
      bed: '#3a3a3a',
      cell: '#4a4a4a',
      bedSection: '#6a6a6a',
      outline: '#c9503c',
      text: '#ffffff'
    };
  return mode.current === 'light'
    ? {
        grid: '#d4dce8',
        section: '#b1bfd3',
        bed: '#c8d4e5',
        cell: '#aabbd1',
        bedSection: '#90a6c3',
        outline: '#466dba',
        text: '#324766'
      }
    : {
        grid: '#2c374a',
        section: '#435572',
        bed: '#37475f',
        cell: '#4b5f7c',
        bedSection: '#637b9f',
        outline: '#a9c2ff',
        text: '#dbe6f8'
      };
}
