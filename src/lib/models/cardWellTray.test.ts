import { booleans, measurements, transforms } from '@jscad/modeling';
import { describe, expect, it } from 'vitest';
import {
  createCardWellTray,
  createDefaultCardWellTrayParams,
  getCardWellCellPositions,
  getCardWellCornerRadius,
  getCardWellPositions,
  getCardWellTrayDimensions
} from './cardWellTray';

describe('Card Well minimum exterior dimensions', () => {
  const cards = [{ id: 'cards', name: 'Cards', width: 63, length: 88, thickness: 0.5 }];
  function params() {
    const p = createDefaultCardWellTrayParams();
    p.outerCornerRadius = 0;
    p.stacks[0].cardSizeId = 'cards';
    return p;
  }
  it('keeps automatic dimensions for empty, zero and undersized minimums', () => {
    const p = params();
    const natural = getCardWellTrayDimensions(p, cards);
    for (const value of [null, 0, 1]) {
      expect(
        getCardWellTrayDimensions(
          { ...p, trayWidthOverride: value, trayDepthOverride: value, minimumHeight: value },
          cards
        )
      ).toEqual(natural);
    }
  });
  it('uses stack names for previews and optional engraving without changing cavity dimensions', () => {
    const p = params();
    p.stacks[0].label = 'Salud';
    expect(getCardWellPositions(p, cards)[0].label).toBe('Salud');
    const plain = createCardWellTray(
      { ...p, engraveStackLabels: false },
      cards,
      undefined,
      undefined,
      undefined,
      false
    );
    const engraved = createCardWellTray(p, cards, undefined, undefined, undefined, false);
    expect(measurements.measureVolume(engraved)).toBeLessThan(measurements.measureVolume(plain));
    expect(getCardWellCellPositions(p, cards)).toEqual(
      getCardWellCellPositions({ ...p, engraveStackLabels: false }, cards)
    );
    const thin = { ...p, floorThickness: 0.2 };
    expect(
      measurements.measureVolume(createCardWellTray(thin, cards, undefined, undefined, undefined, false))
    ).toBeCloseTo(
      measurements.measureVolume(
        createCardWellTray({ ...thin, engraveStackLabels: false }, cards, undefined, undefined, undefined, false)
      ),
      8
    );
  });
  it('places opposite well labels at the exterior edges and rotates the second text by 180 degrees', () => {
    const p = params();
    p.layout = { columns: [['a', 'b']] };
    p.stacks = ['a', 'b'].map((id) => ({ id, cellId: id, cardSizeId: 'cards', count: 30, rotation: 0 }));
    const body = createCardWellTray(p, cards, undefined, undefined, undefined, false);
    const cuts = [0, 1].map((index) => {
      const labeled = { ...p, stacks: p.stacks.map((s, i) => ({ ...s, label: i === index ? 'ABC' : '' })) };
      return booleans.subtract(body, createCardWellTray(labeled, cards, undefined, undefined, undefined, false));
    });
    const dims = getCardWellTrayDimensions(p, cards);
    const cells = getCardWellCellPositions(p, cards);
    expect(measurements.measureBoundingBox(cuts[0])[1][1]).toBeLessThan(cells[0].y + cells[0].depth / 2);
    expect(measurements.measureBoundingBox(cuts[1])[0][1]).toBeGreaterThan(cells[1].y + cells[1].depth / 2);
    const turned = transforms.translate([dims.width, dims.depth, 0], transforms.rotateZ(Math.PI, cuts[0]));
    expect(Math.abs(measurements.measureVolume(booleans.subtract(turned, cuts[1])))).toBeLessThan(0.00001);
    expect(Math.abs(measurements.measureVolume(booleans.subtract(cuts[1], turned)))).toBeLessThan(0.00001);
  });
  it('defaults new wells to a requested 3 mm radius while preserving square or older saved settings', () => {
    expect(createDefaultCardWellTrayParams().outerCornerRadius).toBe(3);
    expect(getCardWellCornerRadius({ ...params(), outerCornerRadius: 0 }, cards)).toBe(0);
    expect(getCardWellCornerRadius({ ...params(), outerCornerRadius: undefined }, cards)).toBe(0);
  });
  it('rounds exterior corners within available margins without changing wells or exterior dimensions', () => {
    const p = params();
    expect(getCardWellCornerRadius(p, cards)).toBe(0);
    const rounded = { ...p, outerCornerRadius: 30 };
    expect(getCardWellCornerRadius(rounded, cards)).toBe(p.wallThickness);
    expect(getCardWellTrayDimensions(rounded, cards)).toEqual(getCardWellTrayDimensions(p, cards));
    expect(getCardWellCellPositions(rounded, cards)).toEqual(getCardWellCellPositions(p, cards));
    const squareBody = createCardWellTray(p, cards, undefined, undefined, undefined, false);
    const roundBody = createCardWellTray(rounded, cards, undefined, undefined, undefined, false);
    expect(measurements.measureVolume(roundBody)).toBeLessThan(measurements.measureVolume(squareBody));
    const bounds = measurements.measureBoundingBox(roundBody);
    measurements
      .measureBoundingBox(squareBody)
      .forEach((point, i) => point.forEach((value, axis) => expect(bounds[i][axis]).toBeCloseTo(value, 8)));
    const natural = getCardWellTrayDimensions(p, cards);
    expect(
      getCardWellCornerRadius(
        { ...rounded, trayWidthOverride: natural.width + 20, trayDepthOverride: natural.depth + 40 },
        cards
      )
    ).toBeGreaterThan(p.wallThickness);
    const withNotches = { ...rounded, extractionNotches: true };
    expect(
      measurements.measureVolume(createCardWellTray(withNotches, cards, undefined, undefined, undefined, false))
    ).toBeGreaterThan(0);
  });
  it('cuts extraction channels through the full height while preserving card cavities and exterior bounds', () => {
    const p = params();
    const natural = getCardWellTrayDimensions(p, cards);
    const grips = { ...p, extractionNotches: true, extractionNotchDiameter: 20 };
    const size = getCardWellTrayDimensions(grips, cards);
    expect(size.width).toBe(natural.width + 20);
    expect(size.depth).toBe(natural.depth);
    const before = getCardWellCellPositions(p, cards)[0];
    const after = getCardWellCellPositions(grips, cards)[0];
    expect(after.x - before.x).toBeCloseTo(10);
    expect(after.y).toBe(before.y);
    expect(after.z).toBe(before.z);
    expect(after.width).toBe(before.width);
    expect(after.depth).toBe(before.depth);
    const baseline = createCardWellTray(
      { ...p, trayWidthOverride: size.width },
      cards,
      undefined,
      60,
      undefined,
      false
    );
    const notched = createCardWellTray(grips, cards, undefined, 60, undefined, false);
    const bounds = measurements.measureBoundingBox(notched);
    measurements.measureBoundingBox(baseline).forEach((point, i) =>
      point.forEach((value, axis) => {
        expect(bounds[i][axis]).toBeCloseTo(value, 8);
      })
    );
    const removed = measurements.measureVolume(baseline) - measurements.measureVolume(notched);
    const circleArea = (48 * Math.sin((2 * Math.PI) / 48) * 100) / 2;
    expect(removed).toBeCloseTo(circleArea * 60, 3);
    expect(getCardWellTrayDimensions({ ...grips, extractionNotches: false }, cards)).toEqual(natural);
  });
  it('uses spare length in the central divider for grips without increasing width or existing minimum dimensions', () => {
    const p = params();
    p.layout = { columns: [['a', 'b']] };
    p.stacks = ['a', 'b'].map((id) => ({ id, cellId: id, cardSizeId: 'cards', count: 30, rotation: 0 }));
    const natural = getCardWellTrayDimensions(p, cards);
    const configured = { ...p, trayDepthOverride: natural.depth + 60 };
    const grip = { ...configured, extractionNotches: true, extractionNotchDiameter: 20 };
    expect(getCardWellTrayDimensions(grip, cards)).toEqual(getCardWellTrayDimensions(configured, cards));
    const cells = getCardWellCellPositions(grip, cards);
    expect(cells[0].x).toBe(p.wallThickness);
    expect(cells[0].y).toBe(p.wallThickness);
    expect(cells[1].y - cells[0].y - cells[0].depth).toBeCloseTo(p.wallThickness + 60);
    const center = getCardWellTrayDimensions(grip, cards).depth / 2;
    expect(center - (cells[0].y + cells[0].depth)).toBeGreaterThanOrEqual(12);
    expect(cells[1].y - center).toBeGreaterThanOrEqual(12);
    const minimum = getCardWellTrayDimensions({ ...p, extractionNotches: true }, cards);
    expect(minimum.width).toBe(natural.width);
    expect(minimum.depth - natural.depth).toBeCloseTo(22);
  });
  it('protects both outer columns when their stack counts differ', () => {
    const p = params();
    p.extractionNotches = true;
    p.layout = { columns: [['a', 'b', 'c'], ['d'], ['e', 'f']] };
    p.stacks = ['a', 'b', 'c', 'd', 'e', 'f'].map((id) => ({
      id,
      cellId: id,
      cardSizeId: 'cards',
      count: 30,
      rotation: 0
    }));
    const dimensions = getCardWellTrayDimensions(p, cards);
    const center = dimensions.depth / 2;
    for (const cell of getCardWellCellPositions(p, cards)) {
      expect(cell.y).toBeGreaterThanOrEqual(p.wallThickness);
      expect(cell.y + cell.depth).toBeLessThanOrEqual(dimensions.depth - p.wallThickness);
      if (cell.colIndex === 0 || cell.colIndex === 2) {
        expect(cell.y + cell.depth <= center - 12 || cell.y >= center + 12).toBe(true);
      }
    }
  });
  it('shares growth equally between outer margins and dividers on both axes without enlarging wells', () => {
    const p = params();
    p.layout = {
      columns: [
        ['a', 'b'],
        ['c', 'd']
      ]
    };
    p.stacks = ['a', 'b', 'c', 'd'].map((id) => ({ id, cellId: id, cardSizeId: 'cards', count: 30, rotation: 0 }));
    const natural = getCardWellTrayDimensions(p, cards);
    const before = getCardWellCellPositions(p, cards);
    const grown = { ...p, trayWidthOverride: natural.width + 30, trayDepthOverride: natural.depth + 60 };
    const after = getCardWellCellPositions(grown, cards);
    expect(after[0].x - before[0].x).toBeCloseTo(10);
    expect(after[2].x - before[2].x).toBeCloseTo(20);
    expect(grown.trayWidthOverride - after[2].x - after[2].width - p.wallThickness).toBeCloseTo(10);
    expect(after[0].y - before[0].y).toBeCloseTo(20);
    expect(after[1].y - before[1].y).toBeCloseTo(40);
    expect(grown.trayDepthOverride - after[1].y - after[1].depth - p.wallThickness).toBeCloseTo(20);
    after.forEach((cell, i) => {
      expect(cell.width).toBe(before[i].width);
      expect(cell.depth).toBe(before[i].depth);
      expect(cell.z).toBe(before[i].z);
    });
  });
  it('centers unchanged cavities and cards, raises their floors, and exports the requested size', () => {
    const p = params();
    const natural = getCardWellTrayDimensions(p, cards);
    const before = getCardWellCellPositions(p, cards)[0];
    const grown = {
      ...p,
      trayWidthOverride: natural.width + 20,
      trayDepthOverride: natural.depth + 40,
      minimumHeight: natural.height + 15
    };
    const after = getCardWellCellPositions(grown, cards)[0];
    expect(after.x - before.x).toBeCloseTo(10);
    expect(after.y - before.y).toBeCloseTo(20);
    expect(after.z - before.z).toBeCloseTo(15);
    expect(after.width).toBe(before.width);
    expect(after.depth).toBe(before.depth);
    expect(after.height).toBe(before.height);
    const preview = getCardWellPositions(grown, cards)[0];
    const originalPreview = getCardWellPositions(p, cards)[0];
    expect(preview.x - originalPreview.x).toBeCloseTo(10);
    expect(preview.y - originalPreview.y).toBeCloseTo(20);
    expect(preview.z - originalPreview.z).toBeCloseTo(15);
    const bounds = measurements.measureBoundingBox(
      createCardWellTray(grown, cards, undefined, undefined, undefined, false)
    );
    expect(bounds[1].map((v, i) => v - bounds[0][i])).toEqual([
      natural.width + 20,
      natural.depth + 40,
      natural.height + 15
    ]);
    expect(getCardWellCellPositions(grown, cards, natural.height + 25)[0].z - before.z).toBeCloseTo(25);
  });
});
