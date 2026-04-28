import { describe, expect, it } from 'vitest';

import {
  createCardDividerTray,
  defaultCardDividerTrayParams,
  getCardDividerPositions,
  getCardDividerTrayDimensions,
  sanitizeCardDividerTrayParams,
  validateCardDividerHeight
} from './cardDividerTray';
import { DEFAULT_CARD_SIZE_IDS } from './counterTray';
import type { CardSize } from '$lib/types/project';

const cardSizes: CardSize[] = [
  {
    id: DEFAULT_CARD_SIZE_IDS.standard,
    name: 'Standard',
    width: 63,
    length: 88,
    thickness: 0.3
  },
  {
    id: DEFAULT_CARD_SIZE_IDS.miniAmerican,
    name: 'Mini American',
    width: 41,
    length: 63,
    thickness: 0.3
  }
];

describe('card divider tray angled height limits', () => {
  it('tilts taller stacks when max height is lower than the natural height', () => {
    const natural = getCardDividerTrayDimensions(defaultCardDividerTrayParams, cardSizes);
    const minimum = validateCardDividerHeight(defaultCardDividerTrayParams, cardSizes).minimumHeight;
    const tiltedParams = {
      ...defaultCardDividerTrayParams,
      maxHeight: Math.max(minimum + 1, natural.height - 5)
    };

    const validation = validateCardDividerHeight(tiltedParams, cardSizes);
    const tilted = getCardDividerTrayDimensions(tiltedParams, cardSizes);
    const positions = getCardDividerPositions(tiltedParams, cardSizes);

    expect(validation.valid).toBe(true);
    expect(validation.usesAngledCards).toBe(true);
    expect(tilted.height).toBeCloseTo(tiltedParams.maxHeight ?? 0);
    expect(tilted.depth).toBeGreaterThan(natural.depth);
    expect(positions.some((position) => position.tiltAngle > 0)).toBe(true);
  });

  it('falls back to the natural height when max height is below the minimum support angle', () => {
    const natural = getCardDividerTrayDimensions(defaultCardDividerTrayParams, cardSizes);
    const invalidParams = {
      ...defaultCardDividerTrayParams,
      maxHeight: 40
    };

    const validation = validateCardDividerHeight(invalidParams, cardSizes);
    const dimensions = getCardDividerTrayDimensions(invalidParams, cardSizes);

    expect(validation.valid).toBe(false);
    expect(validation.minimumHeight).toBeGreaterThan(invalidParams.maxHeight ?? 0);
    expect(dimensions.height).toBeCloseTo(natural.height);
  });

  it('clears an invalid max height when orientation changes to a taller card stance', () => {
    const params = {
      ...defaultCardDividerTrayParams,
      orientation: 'vertical' as const,
      stackDirection: 'sideBySide' as const,
      rimHeight: 0,
      maxHeight: 65,
      stacks: [
        { cardSizeId: DEFAULT_CARD_SIZE_IDS.standard, count: 30, label: 'A' },
        { cardSizeId: DEFAULT_CARD_SIZE_IDS.standard, count: 30, label: 'B' },
        { cardSizeId: DEFAULT_CARD_SIZE_IDS.standard, count: 30, label: 'C' }
      ]
    };

    const sanitized = sanitizeCardDividerTrayParams(params, cardSizes);

    expect(sanitized.maxHeight).toBeNull();
  });

  it('resolves angles per stack when the tray mixes card sizes', () => {
    const params = {
      ...defaultCardDividerTrayParams,
      stackDirection: 'frontToBack' as const,
      maxHeight: 61,
      stacks: [
        { cardSizeId: DEFAULT_CARD_SIZE_IDS.standard, count: 30, label: 'Large' },
        { cardSizeId: DEFAULT_CARD_SIZE_IDS.miniAmerican, count: 30, label: 'Small' }
      ]
    };

    const positions = getCardDividerPositions(params, cardSizes);

    expect(positions).toHaveLength(2);
    expect(positions[0].tiltAngle).not.toBeCloseTo(positions[1].tiltAngle);
  });

  it('reuses a shared angled divider between adjacent stacks with the same angle', () => {
    const params = {
      ...defaultCardDividerTrayParams,
      stackDirection: 'frontToBack' as const,
      maxHeight: 61,
      stacks: [
        { cardSizeId: DEFAULT_CARD_SIZE_IDS.standard, count: 30, label: 'A' },
        { cardSizeId: DEFAULT_CARD_SIZE_IDS.standard, count: 30, label: 'B' }
      ]
    };

    const positions = getCardDividerPositions(params, cardSizes);
    const centerSpacing = Math.abs(positions[1].y - positions[0].y);

    expect(positions).toHaveLength(2);
    expect(positions[0].tiltAngle).toBeCloseTo(positions[1].tiltAngle);
    expect(centerSpacing).toBeLessThan(positions[0].slotDepth + params.wallThickness);
  });

  it('falls back to a vertical divider between adjacent stacks with different angles', () => {
    const params = {
      ...defaultCardDividerTrayParams,
      stackDirection: 'frontToBack' as const,
      maxHeight: 61,
      stacks: [
        { cardSizeId: DEFAULT_CARD_SIZE_IDS.standard, count: 30, label: 'Large' },
        { cardSizeId: DEFAULT_CARD_SIZE_IDS.miniAmerican, count: 30, label: 'Small' }
      ]
    };

    const positions = getCardDividerPositions(params, cardSizes);
    const centerSpacing = Math.abs(positions[1].y - positions[0].y);

    expect(positions).toHaveLength(2);
    expect(positions[0].tiltAngle).not.toBeCloseTo(positions[1].tiltAngle);
    expect(centerSpacing).toBeGreaterThan(positions[0].stackDepth + params.wallThickness);
  });

  it('builds geometry for an angled divider tray without throwing', () => {
    const params = {
      ...defaultCardDividerTrayParams,
      maxHeight: 60
    };

    expect(() => createCardDividerTray(params, cardSizes, 'Card Divider')).not.toThrow();
  });
});
