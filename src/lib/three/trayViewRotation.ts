import type { Project } from '$lib/types/project';
import { Matrix4 } from 'three';

// Layout rotation is presentation state; keep the model and exported geometry in their own axes.
export function getCardWellViewRotation(project: Project, trayId: string): number {
  for (const layer of project.layers) {
    const loose = layer.looseTrays.find((t) => t.id === trayId);
    if (loose?.type === 'cardWell')
      return (
        layer.manualLayout?.looseTrays?.find((p) => p.trayId === trayId)?.rotation ??
        (loose.rotationOverride === 'auto' ? 0 : (loose.rotationOverride ?? 0))
      );
    for (const box of layer.boxes) {
      const tray = box.trays.find((t) => t.id === trayId);
      if (tray?.type === 'cardWell')
        return (
          box.manualLayout?.find((p) => p.trayId === trayId)?.rotation ??
          (tray.rotationOverride === 'auto' ? 0 : (tray.rotationOverride ?? 0))
        );
    }
  }
  return 0;
}

export function trayViewRotationMatrix(degrees: number, centerX: number, centerZ: number): Matrix4 {
  return new Matrix4()
    .makeTranslation(centerX, 0, centerZ)
    .multiply(new Matrix4().makeRotationY((degrees * Math.PI) / 180))
    .multiply(new Matrix4().makeTranslation(-centerX, 0, -centerZ));
}
