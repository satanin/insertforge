import sampleJson from '$lib/data/defaultProject.json';
import type { Project, Tray } from '$lib/types/project';
import jscad from '@jscad/modeling';
import { describe, expect, it } from 'vitest';
import { createCardDrawTray } from './cardTray';
import { createCardWellTray } from './cardWellTray';
import { createCounterTray } from './counterTray';
import { createCupTray } from './cupTray';
import { FLOOR_TEXT_CURVE_SEGMENTS } from './emboss';
import { createBoxWithLidGrooves } from './lid';

const sample = sampleJson as unknown as Project;
const box = sample.layers[0].boxes[0];
const trays = sample.layers.flatMap((layer) => [...layer.boxes.flatMap((box) => box.trays), ...layer.looseTrays]);

function build(tray: Tray, height: number) {
  const args = [tray.name, height, 0, true] as const;
  switch (tray.type) {
    case 'counter':
      return createCounterTray(tray.params, sample.counterShapes, ...args);
    case 'cup':
      return createCupTray(tray.params, ...args);
    case 'cardDraw':
      return createCardDrawTray(tray.params, sample.cardSizes, ...args);
    case 'cardWell':
      return createCardWellTray(tray.params, sample.cardSizes, ...args);
    default:
      throw new Error(`Unexpected reference type: ${tray.type}`);
  }
}

// Measured from the unmodified worker's default-project meshes (128-segment
// floor text). Keep each reference independent of the optimized implementation.
const references = [
  {
    name: 'Counter tray',
    height: 23,
    volume: 98786.10136435847,
    size: [143, 41.459739685058594, 23],
    triangles: 17031
  },
  {
    name: 'More counters',
    height: 23,
    volume: 73719.22255629522,
    size: [116.73038482666016, 41.459739685058594, 23],
    triangles: 20985
  },
  { name: 'Cup tray', height: 27, volume: 71241.2455601115, size: [150, 100, 27], triangles: 8870 },
  { name: 'Split cup tray', height: 52, volume: 62496.69050854456, size: [73, 102, 52], triangles: 12957 },
  { name: 'Card draw', height: 52, volume: 75207.54428677817, size: [77, 102.05, 52], triangles: 12547 },
  { name: 'Card well', height: 20, volume: 117037.39669446487, size: [142, 145, 20], triangles: 11514 }
];

function verify(geometry: ReturnType<typeof createCounterTray>, volume: number, size: number[], triangles: number) {
  expect(Math.abs(jscad.measurements.measureVolume(geometry) - volume) / volume).toBeLessThan(0.00001);
  const bounds = jscad.measurements.measureBoundingBox(geometry);
  size.forEach((dimension, axis) => expect(bounds[1][axis] - bounds[0][axis]).toBeCloseTo(dimension, 4));
  const currentTriangles = jscad.geometries.geom3
    .toPolygons(geometry)
    .reduce((sum, polygon) => sum + polygon.vertices.length - 2, 0);
  expect(currentTriangles).toBeLessThan(triangles * 0.6);
}

describe('default-project floor engraving regression', () => {
  it('keeps the curve approximation error below 0.006 mm for the largest floor-text stroke', () => {
    expect(0.6 * (1 - Math.cos(Math.PI / FLOOR_TEXT_CURVE_SEGMENTS))).toBeLessThan(0.006);
  });
  for (const reference of references) {
    it(`preserves ${reference.name} dimensions and high-resolution volume with fewer triangles`, () => {
      const tray = trays.find((tray) => tray.name === reference.name)!;
      verify(build(tray, reference.height), reference.volume, reference.size, reference.triangles);
    });
  }
  it('preserves the Counter Box shell and its tray-name engraving', () => {
    verify(
      createBoxWithLidGrooves(box, sample.cardSizes, sample.counterShapes, 27)!,
      80804.50275854656,
      [150, 89.91947937011719, 25],
      30160
    );
  });
});
