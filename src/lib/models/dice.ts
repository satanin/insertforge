import type { DiceSize } from '$lib/types/project';

// Editable starting measurements, not a manufacturing standard.
export const DEFAULT_DICE_SIZES: readonly DiceSize[] = [
  { id: 'dice-d4', name: 'D4', kind: 'd4', size: 20 },
  { id: 'dice-d6', name: 'D6', kind: 'd6', size: 16 },
  { id: 'dice-d8', name: 'D8', kind: 'd8', size: 20 },
  { id: 'dice-d10', name: 'D10', kind: 'd10', size: 20 },
  { id: 'dice-d12', name: 'D12', kind: 'd12', size: 20 },
  { id: 'dice-d20', name: 'D20', kind: 'd20', size: 25 }
];

export function createDefaultDiceSizes(): DiceSize[] {
  return DEFAULT_DICE_SIZES.map(die => ({ ...die }));
}
