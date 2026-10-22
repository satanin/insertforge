/** Select by stable IDs, never by editable/display names. Retains original generated heights. */
export function selectExportElements<
  T extends { elementId?: string; trayName: string; trayGeom: unknown; parts?: { id: string }[] },
  B extends { elementId?: string; trays: { elementId?: string; name: string; jscadGeom: T['trayGeom']; parts?: { id: string }[] }[] }
>(boxes: B[], looseTrays: T[], individualParts: T[], elementId?: string, partId?: string) {
  if (!elementId) return { boxes, trays: looseTrays };
  const trays = [...looseTrays, ...individualParts].filter(tray => tray.elementId === elementId).map(tray => ({
    ...tray, parts: partId && partId !== 'all' ? tray.parts?.filter(part => part.id === partId) : tray.parts
  })) as T[];
  for (const box of boxes) {
    for (const tray of box.trays) {
      if (tray.elementId === elementId) trays.push({ elementId, trayName: tray.name, trayGeom: tray.jscadGeom,
        ...(tray.parts ? { parts: partId && partId !== 'all' ? tray.parts.filter(part => part.id === partId) : tray.parts } : {}) } as T);
    }
  }
  return { boxes: boxes.filter(box => box.elementId === elementId), trays };
}
