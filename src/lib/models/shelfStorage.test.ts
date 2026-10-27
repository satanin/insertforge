import { describe, expect, it } from 'vitest';
import jscad from '@jscad/modeling';
import { createShelfDrawerParts, defaultShelfDrawerParams, resolveShelfDrawer, shelfPrintGeometry, shelfExplodeOffsets, MIN_STACK_SOCKET_WEB } from './shelfStorage';
import type { CardSize } from '$lib/types/project';
import type { Geom3 } from '@jscad/modeling/src/geometries/types';
import { resolveShelfFit } from './shelfFit';

const cards: CardSize[] = [{ id: 'standard', name: 'Standard', width: 63, length: 88, thickness: 0.3,
  sleeveThicknesses: { none: 0.3, normal: 0.5, premium: 0.8 } }];
const defaults = { ...defaultShelfDrawerParams };
const volume = (g: Geom3) => Math.abs(jscad.measurements.measureVolume(g));
const overlap = (a: Geom3, b: Geom3) => volume(jscad.booleans.intersect(a, b));
const move = (g: Geom3, x: number, y: number, z: number) => jscad.transforms.translate([x, y, z], g);

describe('modular shelf card drawer', () => {
  it('fits 4 columns by 3 rows in a 330 mm opening without shrinking Premium card spaces', () => {
    const actualCards = [{ ...cards[0], width: 66, length: 91 }];
    const compact = { ...defaults, shellThickness: 2, drawerFloor: 1.2, headroom: 1, sleeve: 'premium' as const };
    const parts = createShelfDrawerParts(compact, actualCards), r = parts.resolved;
    const fit = resolveShelfFit(r, { width: 330, height: 330, depth: 390, margin: 2 });
    expect([fit.columns, fit.rows, fit.total]).toEqual([4, 3, 12]);
    expect(fit.usedWidth + 4).toBeLessThanOrEqual(330);
    expect(fit.usedHeight + 4).toBeLessThanOrEqual(330);
    expect(r.drawerWidth - 2 * compact.drawerWall).toBeGreaterThanOrEqual(68);
    expect(r.cardHeight).toBe(91);
    expect(r.labelHeight).toBe(91);
    expect(r.socketWeb).toBeGreaterThanOrEqual(1.2 - 1e-8);
    expect(r.handleDrop).toBe(8);
    const [x, y, z] = parts.drawerOffset;
    for (const distance of [0, 20, 100, r.drawerDepth + 20]) {
      expect(overlap(parts.shell, move(parts.drawer, x, y - distance, z))).toBeLessThan(1e-5);
      expect(overlap(parts.shell, move(parts.handle, x, y - distance, z))).toBeLessThan(1e-5);
    }
    for (const pos of [[r.bodyWidth, 0, 0], [0, 0, r.bodyHeight]])
      expect(overlap(parts.shell, move(parts.shell, pos[0], pos[1], pos[2]))).toBeLessThan(1e-5);
  });
  it('extracts the drawer before lifting the inverted-U handle in preview', () => {
    const { resolved: r, drawer, handle } = createShelfDrawerParts(defaults, cards);
    expect(shelfExplodeOffsets(0, r.drawerDepth, r.handleHeight)).toEqual({ drawerTravel: 0, handleLift: 0 });
    const extracted = shelfExplodeOffsets(70, r.drawerDepth, r.handleHeight);
    expect(extracted.drawerTravel).toBeGreaterThan(r.drawerDepth);
    expect(extracted.handleLift).toBe(0);
    for (const amount of [75, 85, 100]) {
      const step = shelfExplodeOffsets(amount, r.drawerDepth, r.handleHeight);
      expect(step.drawerTravel).toBe(extracted.drawerTravel);
      expect(step.handleLift).toBeGreaterThan(0);
      expect(overlap(drawer, move(handle, 0, 0, step.handleLift))).toBeLessThan(1e-5);
    }
    const end = shelfExplodeOffsets(100, r.drawerDepth, r.handleHeight);
    expect(end.handleLift).toBeGreaterThan(r.handleHeight);
    expect(shelfExplodeOffsets(200, r.drawerDepth, r.handleHeight)).toEqual(end);
  });
  it('preserves card space while reserving room for the independent identification window', () => {
    const r = resolveShelfDrawer(defaults, cards);
    expect(r.valid).toBe(true);
    expect(r.depth).toBe(240);
    expect(r.drawerWidth).toBeGreaterThanOrEqual(r.cardWidth + 2 * (defaults.drawerWall + defaults.cardClearance));
    expect(r.drawerWidth).toBeGreaterThanOrEqual(r.labelWidth + 0.6 + 2 * defaults.drawerWall);
    expect(r.drawerHeight).toBeGreaterThanOrEqual(r.labelZ + r.labelHeight + 2);
    expect(r.panelThickness).toBeCloseTo(3.8);
    expect(r.capacity).toBe(740);
    const sleeved = resolveShelfDrawer({ ...defaults, sleeve: 'premium' }, cards);
    expect(sleeved.capacity).toBe(277);
    const noWindow = resolveShelfDrawer({ ...defaults, labelWindow: false }, cards);
    expect(noWindow.capacity).toBeGreaterThan(r.capacity); // Solid backing reserves 1.2 mm additional depth.
    expect(noWindow.drawerHeight).toBeLessThan(r.drawerHeight);
    expect(r.drawerHeight).toBeCloseTo(101.85);
    expect(r.labelZ).toBeLessThan(defaults.drawerFloor + 18);
  });
  it('keeps shell, drawer and printed handle separate and the extraction path clear', () => {
    const parts = createShelfDrawerParts(defaults, cards), r = parts.resolved;
    const [x, y, z] = parts.drawerOffset;
    expect(overlap(parts.drawer, parts.handle)).toBeLessThan(1e-5);
    for (const distance of [0, 2, 20, 100, r.drawerDepth + 20]) {
      expect(overlap(parts.shell, move(parts.drawer, x, y - distance, z))).toBeLessThan(1e-5);
      expect(overlap(parts.shell, move(parts.handle, x, y - distance, z))).toBeLessThan(1e-5);
    }
    expect(overlap(parts.shell, move(parts.drawer, x, y, z - 0.02))).toBeGreaterThan(1);
    const content = jscad.primitives.cuboid({ size: [r.cardWidth, r.capacity * r.cardThickness, r.cardHeight],
      center: [defaults.drawerWall + defaults.cardClearance + r.cardWidth / 2,
        r.frontReserve + defaults.cardClearance + r.capacity * r.cardThickness / 2,
        defaults.drawerFloor + r.cardHeight / 2] });
    expect(overlap(parts.drawer, content)).toBeLessThan(1e-5);
  });
  it('mates in both axes and stops the forward travel of the male-bearing module', () => {
    const { shell, resolved: r } = createShelfDrawerParts(defaults, cards);
    expect(overlap(shell, move(shell, 0, 0, r.bodyHeight))).toBeLessThan(1e-5);
    expect(overlap(shell, move(shell, r.bodyWidth, 0, 0))).toBeLessThan(1e-5);
    // Upper female pulls forward along the assembly path; rear lock intentionally omitted.
    expect(overlap(shell, move(shell, 0, -5, r.bodyHeight))).toBeLessThan(1e-5);
    expect(overlap(shell, move(shell, 0, 0.6, r.bodyHeight))).toBeGreaterThan(1);
    // The right-hand module has a female left socket, matching the upper socket's direction.
    expect(overlap(shell, move(shell, r.bodyWidth, 0.6, 0))).toBeGreaterThan(1);
    expect(overlap(shell, move(shell, r.bodyWidth, -5, 0))).toBeLessThan(1e-5);
    // Undercut prevents simply lifting/pulling adjacent modules apart.
    expect(overlap(shell, move(shell, 0, 0, r.bodyHeight + 1))).toBeGreaterThan(1);
    expect(overlap(shell, move(shell, r.bodyWidth + 1, 0, 0))).toBeGreaterThan(1);
    // A 2×2 array shares the same pitch without intersecting opposite modules.
    expect(overlap(shell, move(shell, r.bodyWidth, 0, r.bodyHeight))).toBeLessThan(1e-5);
  });
  it('leaves at least 1.2 mm behind both female sockets and a solid front stop', () => {
    for (const thickness of [1.2, 3, 6]) {
      const { shell, resolved: r } = createShelfDrawerParts({ ...defaults, shellThickness: thickness }, cards);
      expect(r.socketWeb).toBeGreaterThanOrEqual(MIN_STACK_SOCKET_WEB - 1e-8);
      const probe = (x: number, y: number, z: number, w: number, d: number, h: number) =>
        jscad.primitives.cuboid({ size: [w, d, h], center: [x + w / 2, y + d / 2, z + h / 2] });
      const bottomCover = probe(r.bodyWidth / 2 - 1, 20, 2.61, 2, 4, 1.18);
      const leftCover = probe(2.61, 20, r.bodyHeight / 2 - 1, 1.18, 4, 2);
      for (const web of [bottomCover, leftCover]) expect(overlap(shell, web)).toBeCloseTo(volume(web), 5);
      const stop = probe(r.bodyWidth / 2 - 1, 1, 0.1, 2, 7, 2);
      expect(overlap(shell, stop)).toBeCloseTo(volume(stop), 5);
      const socketVoid = probe(r.bodyWidth / 2 - 1, 20, 0.1, 2, 4, 2);
      expect(overlap(shell, socketVoid)).toBeLessThan(1e-5);
    }
  });
  it('keeps the left exterior flush and puts the side male to the right as seen from the front', () => {
    const { shell, resolved: r } = createShelfDrawerParts(defaults, cards);
    const bounds = jscad.measurements.measureBoundingBox(shell);
    expect(bounds[0][0]).toBeCloseTo(0);
    expect(bounds[1][0]).toBeCloseTo(r.bodyWidth + r.stackKeyHeight);
    const socket = jscad.primitives.cuboid({ size: [2, 4, 2], center: [1.1, 22, r.bodyHeight / 2] });
    expect(overlap(shell, socket)).toBeLessThan(1e-5);
  });
  it('provides a top-open identification slot separate from the storage cavity', () => {
    const { drawer, handle, resolved: r } = createShelfDrawerParts(defaults, cards);
    for (const lift of [0, 5, r.labelHeight, r.labelHeight + 10]) {
      const card = jscad.primitives.cuboid({ size: [r.labelWidth, r.premiumThickness, r.labelHeight],
        center: [r.labelX + r.labelWidth / 2, r.labelSlotY + r.labelSlotDepth / 2, r.labelZ + lift + r.labelHeight / 2] });
      expect(overlap(drawer, card)).toBeLessThan(1e-5);
      if (lift === 0) expect(overlap(handle, card)).toBeLessThan(1e-5);
    }
    const back = jscad.primitives.cuboid({ size: [10, r.labelBackWall - 0.02, 10],
      center: [r.drawerWidth / 2, r.labelSlotY + r.labelSlotDepth + r.labelBackWall / 2, r.labelZ + 10] });
    expect(overlap(drawer, back)).toBeCloseTo(volume(back), 5);
    const liftedCard = jscad.primitives.cuboid({ size: [r.labelWidth, r.premiumThickness, r.labelHeight],
      center: [r.labelX + r.labelWidth / 2, r.labelSlotY + r.labelSlotDepth / 2, r.labelZ + 10 + r.labelHeight / 2] });
    expect(overlap(handle, liftedCard)).toBeGreaterThan(1); // Remove the U before changing the label.
  });
  it('reserves a Premium label with sliding clearance and adapts to project sleeve thickness', () => {
    const r = resolveShelfDrawer(defaults, cards);
    expect(r.labelWidth).toBe(66);
    expect(r.labelHeight).toBe(91);
    expect(r.handleTongueThickness).toBeCloseTo(1.4);
    expect(r.labelSlotDepth).toBeCloseTo(1.9);
    expect(r.frontThickness).toBeCloseTo(6.7);
    expect(r.frontThickness - r.labelSlotY - r.labelSlotDepth).toBeGreaterThanOrEqual(2.4 - 1e-8);
    expect(r.labelFaceWall).toBe(2.4);
    const thickSleeves = cards.map(card => ({ ...card, sleeveThicknesses: { none: 0.3, normal: 0.5, premium: 2.6 } }));
    const parts = createShelfDrawerParts(defaults, thickSleeves);
    const adapted = parts.resolved;
    expect(adapted.labelSlotDepth).toBeCloseTo(3.2);
    expect(adapted.frontThickness).toBeCloseTo(8);
    const label = jscad.primitives.cuboid({ size: [adapted.labelWidth, 2.6, adapted.labelHeight],
      center: [adapted.drawerWidth / 2, adapted.labelSlotY + adapted.labelSlotDepth / 2, adapted.labelZ + adapted.labelHeight / 2] });
    expect(overlap(parts.drawer, label)).toBeLessThan(1e-5);
    expect(overlap(parts.drawer, parts.handle)).toBeLessThan(1e-5);
    const frontLip = jscad.primitives.cuboid({ size: [2, adapted.labelFaceWall - 0.02, 10],
      center: [adapted.labelSlotX + 1.5, adapted.labelFaceWall / 2, adapted.labelZ + 12] });
    expect(overlap(parts.drawer, frontLip)).toBeCloseTo(volume(frontLip), 5);
  });
  it('keeps the entire sleeved label below the grip and stops downward travel on side shoulders', () => {
    for (const wall of [1.2, 2, 4]) {
      const { drawer, handle, resolved: r } = createShelfDrawerParts({ ...defaults, drawerWall: wall }, cards);
      // Everything between the viewer and the label must remain unobstructed.
      const visibleCard = jscad.primitives.cuboid({ size: [r.labelWidth, 22, r.labelHeight],
        center: [r.drawerWidth / 2, r.labelSlotY - 11, r.labelZ + r.labelHeight / 2] });
      expect(overlap(handle, visibleCard)).toBeLessThan(1e-5);
      expect(overlap(drawer, handle)).toBeLessThan(1e-5);
      expect(overlap(drawer, move(handle, 0, 0, -0.2))).toBeLessThan(1e-5);
      expect(overlap(drawer, move(handle, 0, 0, -0.3))).toBeGreaterThan(1);
      expect(r.drawerHeight - r.handleDrop - 0.25 - r.labelZ - r.labelHeight).toBeCloseTo(0.6);
      for (const x of [wall + 1, r.drawerWidth - wall - 1]) {
        const shoulder = jscad.primitives.cuboid({ size: [1, 1, 1],
          center: [x, r.frontThickness - 1, r.handleStopZ - 0.5] });
        expect(overlap(drawer, shoulder)).toBeCloseTo(1);
      }
    }
  });
  it('mounts one continuous inverted U and captures both faces and uncut side walls', () => {
    const { drawer, handle, resolved: r } = createShelfDrawerParts(defaults, cards);
    const bounds = jscad.measurements.measureBoundingBox(handle);
    expect(bounds[0][0]).toBeCloseTo(defaults.drawerWall + 0.25);
    expect(bounds[1][0]).toBeCloseTo(r.drawerWidth - defaults.drawerWall - 0.25);
    expect(bounds[1][2]).toBeCloseTo(r.drawerHeight);
    expect(bounds[1][2] - bounds[0][2]).toBeCloseTo(r.handleHeight);
    expect(overlap(drawer, handle)).toBeLessThan(1e-5);
    expect(overlap(drawer, move(handle, 0, -1.5, 0))).toBeGreaterThan(1);
    expect(overlap(drawer, move(handle, 0, 1.5, 0))).toBeGreaterThan(1);
    expect(overlap(drawer, move(handle, 0, 0, -0.3))).toBeGreaterThan(1);
    for (const side of [-1, 1]) expect(overlap(drawer, move(handle, side, 0, 0))).toBeGreaterThan(0.1);
    for (const lift of [1, 5, r.handleHeight + 1]) expect(overlap(drawer, move(handle, 0, 0, lift))).toBeLessThan(1e-5);
  });
  it('retains the full upper label backing and inserts the front tongue into its channel', () => {
    const { drawer, handle, resolved: r } = createShelfDrawerParts(defaults, cards);
    const backing = jscad.primitives.cuboid({ size: [r.labelWidth - 2, r.labelBackWall - 0.02, 8],
      center: [r.drawerWidth / 2, r.frontThickness - r.labelBackWall / 2, r.handleStopZ - 4.01] });
    expect(overlap(drawer, backing)).toBeCloseTo(volume(backing), 5);
    const tongue = jscad.primitives.cuboid({ size: [r.labelWidth - 2, r.handleTongueThickness - 0.02, 4],
      center: [r.drawerWidth / 2, r.labelSlotY + 0.25 + r.handleTongueThickness / 2, r.drawerHeight - 5] });
    expect(overlap(handle, tongue)).toBeCloseTo(volume(tongue), 5);
    expect(overlap(drawer, tongue)).toBeLessThan(1e-5);
    expect(overlap(drawer, handle)).toBeLessThan(1e-5);
  });
  it('keeps upper side-wall junctions continuous around the recessed central handle seat', () => {
    for (const wall of [1.2, 2, 4]) {
      const { drawer, handle, resolved: r } = createShelfDrawerParts({ ...defaults, drawerWall: wall }, cards);
      const depth = r.handleBayDepth - 0.02;
      for (const x of [0.01, r.drawerWidth - wall + 0.01]) {
        const junction = jscad.primitives.cuboid({ size: [wall - 0.02, depth, r.handleDrop - 0.02],
          center: [x + (wall - 0.02) / 2, r.frontThickness + 0.01 + depth / 2,
            r.drawerHeight - r.handleDrop / 2] });
        expect(overlap(drawer, junction)).toBeCloseTo(volume(junction), 5);
        expect(overlap(handle, junction)).toBeLessThan(1e-5);
      }
      expect(overlap(drawer, handle)).toBeLessThan(1e-5);
      for (const lift of [0.1, 5, r.handleHeight + 1])
        expect(overlap(drawer, move(handle, 0, 0, lift))).toBeLessThan(1e-5);
      // The flush bridge is continuous across the entire space between walls.
      const bridge = jscad.primitives.cuboid({ size: [r.drawerWidth - 2 * wall - 1, r.frontThickness + 0.4, r.handleWall - 0.02],
        center: [r.drawerWidth / 2, r.frontThickness / 2, r.drawerHeight - r.handleWall / 2] });
      expect(overlap(handle, bridge)).toBeCloseTo(volume(bridge), 5);
      for (const x of [wall / 2, r.drawerWidth - wall / 2]) {
        const corner = jscad.primitives.cuboid({ size: [wall - 0.02, r.frontThickness - 0.02, 2],
          center: [x, r.frontThickness / 2, r.drawerHeight - 1.01] });
        expect(overlap(drawer, corner)).toBeCloseTo(volume(corner), 5);
      }
    }
  });
  it('uses independent print orientations and puts every part on Z=0', () => {
    const parts = createShelfDrawerParts(defaults, cards);
    for (const part of ['shell', 'drawer', 'handle'] as const) {
      const geom = shelfPrintGeometry(parts, part);
      const bounds = jscad.measurements.measureBoundingBox(geom);
      bounds[0].forEach(v => expect(v).toBeCloseTo(0));
      expect(volume(geom)).toBeCloseTo(volume(parts[part]), 5);
      if (part === 'shell') expect(bounds[1][2]).toBeCloseTo(defaults.depth);
      if (part === 'handle') expect(bounds[1][2]).toBeCloseTo(parts.resolved.handleHeight);
    }
  });
  it('keeps 2 mm clearance under capture lips and engages them only after upward displacement', () => {
    const { shell, drawer, guideLips, drawerOffset, resolved: r } = createShelfDrawerParts(defaults, cards);
    const [x, y, z] = drawerOffset;
    expect(r.lipClearance).toBe(2);
    expect(r.lipZ - (z + r.sideHeight)).toBeCloseTo(2);
    for (const distance of [0, 20, 100]) {
      expect(overlap(shell, move(drawer, x, y - distance, z))).toBeLessThan(1e-5);
      expect(overlap(guideLips, move(drawer, x, y - distance, z + 1.99))).toBeLessThan(1e-5);
      expect(overlap(guideLips, move(drawer, x, y - distance, z + 2.05))).toBeGreaterThan(1);
    }
    const outerProbe = jscad.primitives.cuboid({ size: [3, 20, r.sideHeight],
      center: [-1.5, r.rampEnd + 20, r.sideHeight / 2] });
    expect(overlap(drawer, outerProbe)).toBeLessThan(1e-5);
    expect(overlap(guideLips, move(drawer, x, y - r.drawerDepth - 20, z + 3))).toBeLessThan(1e-5);
  });
  it('keeps both lip bearing faces flat with full root thickness through the tip', () => {
    const { guideLips, resolved: r } = createShelfDrawerParts(defaults, cards);
    const probe = (x: number, z: number) => jscad.primitives.cuboid({
      size: [0.2, 1, 0.2], center: [x, r.lipStart + 5, z]
    });
    expect(r.lipRootThickness).toBeGreaterThan(r.lipThickness * 2);
    for (const mirror of [false, true]) {
      const x = (distance: number) => mirror ? r.bodyWidth - r.shellSkin - distance : r.panelThickness + distance;
      expect(overlap(guideLips, probe(x(0.3), r.lipZ + r.lipRootThickness - 0.6))).toBeCloseTo(0.04);
      for (const distance of [0.3, (r.sideGap + defaults.drawerWall) / 2, r.sideGap + defaults.drawerWall - 0.3]) {
        expect(overlap(guideLips, probe(x(distance), r.lipZ + r.lipRootThickness - 0.2))).toBeCloseTo(0.04);
        expect(overlap(guideLips, probe(x(distance), r.lipZ + r.lipRootThickness + 0.2))).toBeLessThan(1e-5);
      }
      expect(overlap(guideLips, probe(x(0.3), r.lipZ - 0.2))).toBeLessThan(1e-5);
    }
  });
  it('rejects impossible input and supports standalone shells without connectors', () => {
    for (const p of [{ ...defaults, cardSizeId: 'missing' }, { ...defaults, depth: NaN },
      { ...defaults, labelWidth: 0 }, { ...defaults, labelHeight: 200 }]) {
      expect(resolveShelfDrawer(p, cards).valid).toBe(false);
      expect(() => createShelfDrawerParts(p, cards)).toThrow();
    }
    const r = resolveShelfDrawer({ ...defaults, stackingEnabled: false }, cards);
    expect(r.panelThickness).toBe(defaults.shellThickness);
    expect(r.width).toBe(r.bodyWidth);
    expect(r.height).toBe(r.bodyHeight);
  });
});
