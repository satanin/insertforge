import { addLooseTray, getProject, resetProjectToBlank, saveLayerLayout } from '$lib/stores/project.svelte';
import { Box3, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { getCardWellViewRotation, trayViewRotationMatrix } from './trayViewRotation';

describe('individual Card Well orientation', () => {
  it('reads the saved layout rotation without changing the piece parameters', () => {
    resetProjectToBlank();
    const tray = addLooseTray(undefined, 'cardWell')!;
    const before = JSON.stringify(tray.params);
    const project = getProject();
    expect(getCardWellViewRotation(project, tray.id)).toBe(0);
    saveLayerLayout(project.layers[0].id, [], [{ trayId: tray.id, x: 12, y: 4, rotation: 90 }], []);
    expect(getCardWellViewRotation(project, tray.id)).toBe(90);
    expect(JSON.stringify(tray.params)).toBe(before);
    const other = addLooseTray(undefined, 'counter')!;
    expect(getCardWellViewRotation(project, other.id)).toBe(0);
  });
  it.each([0, 90, 180, 270])('rotates body, card and label coordinates around the same center (%i°)', (degrees) => {
    const matrix = trayViewRotationMatrix(degrees, 20, 100);
    expect(new Vector3(20, 5, 100).applyMatrix4(matrix).distanceTo(new Vector3(20, 5, 100))).toBeLessThan(1e-10);
    const bounds = new Box3(new Vector3(-10, 0, 50), new Vector3(50, 30, 150));
    const rotated = bounds.clone().applyMatrix4(matrix);
    const size = rotated.getSize(new Vector3());
    expect(size.x).toBeCloseTo(degrees % 180 ? 100 : 60);
    expect(size.z).toBeCloseTo(degrees % 180 ? 60 : 100);
    expect(size.y).toBe(30);
    const card = new Vector3(10, 8, 80).applyMatrix4(matrix);
    const label = new Vector3(10, 40, 80).applyMatrix4(matrix);
    expect(card.x).toBeCloseTo(label.x);
    expect(card.z).toBeCloseTo(label.z);
    expect(bounds.min.toArray()).toEqual([-10, 0, 50]);
  });
});
