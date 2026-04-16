import { createCardDividerTray } from '$lib/models/cardDividerTray';
import { createCardDrawTray } from '$lib/models/cardTray';
import { createCardWellTray } from '$lib/models/cardWellTray';
import { createCounterTray } from '$lib/models/counterTray';
import { createCupTray } from '$lib/models/cupTray';
import type { LayeredBoxSectionRenderPlacement } from '$lib/models/layer';
import type { CardSize, CounterShape, LayeredBoxLayer } from '$lib/types/project';
import jscad from '@jscad/modeling';
import type { Geom2, Geom3 } from '@jscad/modeling/src/geometries/types';

const { intersect, subtract, union } = jscad.booleans;
const { expand } = jscad.expansions;
const { extrudeLinear, project: projectFootprint } = jscad.extrusions;
const { measureArea, measureBoundingBox } = jscad.measurements;
const { mirror, rotateZ, translate } = jscad.transforms;
const { cuboid, rectangle } = jscad.primitives;

export function normalizeRotatedSectionGeometry(geometry: Geom3, rotation: 0 | 90 | 180 | 270): Geom3 {
  if (!rotation) return geometry;
  const rotated = rotateZ((rotation * Math.PI) / 180, geometry);
  const [[minX, minY]] = measureBoundingBox(rotated);
  return translate([-minX, -minY, 0], rotated);
}

export function createLayeredBoxSectionJscadGeometry(
  placement: LayeredBoxSectionRenderPlacement,
  cardSizes: CardSize[],
  counterShapes: CounterShape[],
  targetHeight: number
): Geom3 | null {
  if ((placement.section.type === 'counter' || placement.section.type === 'playerBoard') && placement.section.counterParams) {
    const geometry = createCounterTray(
      placement.section.counterParams,
      counterShapes,
      placement.section.name,
      targetHeight,
      0,
      false
    );
    return normalizeRotatedSectionGeometry(geometry, placement.rotation);
  }

  if (placement.section.type === 'cardDraw' && placement.section.cardDrawParams) {
    const geometry = createCardDrawTray(
      placement.section.cardDrawParams,
      cardSizes,
      placement.section.name,
      targetHeight,
      0,
      false
    );
    return normalizeRotatedSectionGeometry(geometry, placement.rotation);
  }

  if (placement.section.type === 'cardDivider' && placement.section.cardDividerParams) {
    const geometry = createCardDividerTray(
      placement.section.cardDividerParams,
      cardSizes,
      placement.section.name,
      targetHeight,
      0,
      false,
      true
    );
    return normalizeRotatedSectionGeometry(geometry, placement.rotation);
  }

  if (placement.section.type === 'cardWell' && placement.section.cardWellParams) {
    const geometry = createCardWellTray(
      placement.section.cardWellParams,
      cardSizes,
      placement.section.name,
      targetHeight,
      0,
      false
    );
    return normalizeRotatedSectionGeometry(geometry, placement.rotation);
  }

  if (placement.section.type === 'cup' && placement.section.cupParams) {
    const geometry = createCupTray(placement.section.cupParams, placement.section.name, targetHeight, 0, false);
    return normalizeRotatedSectionGeometry(geometry, placement.rotation);
  }

  return null;
}

interface LayeredBoxInternalLayerGeometryOptions {
  internalLayer: {
    id: string;
    width: number;
    depth: number;
    height: number;
  };
  layerSections: LayeredBoxSectionRenderPlacement[];
  sourceLayer?: LayeredBoxLayer;
  sectionGeometryMap: Map<string, Geom3>;
  sectionReliefGeometryMap: Map<string, Geom3>;
}

export function createLayeredBoxInternalLayerFillGeometry({
  internalLayer,
  layerSections,
  sourceLayer,
  sectionGeometryMap,
  sectionReliefGeometryMap
}: LayeredBoxInternalLayerGeometryOptions): Geom3 | null {
  const fillSolidEmpty = sourceLayer?.fillSolidEmpty ?? true;
  if (!fillSolidEmpty || layerSections.length === 0) {
    return null;
  }

  const edgeReliefEnabled = sourceLayer?.edgeReliefEnabled ?? true;
  const cavityOverlap = 0.05;
  const outerBlock = cuboid({
    size: [internalLayer.width, internalLayer.depth, internalLayer.height],
    center: [internalLayer.width / 2, internalLayer.depth / 2, internalLayer.height / 2]
  });

  const cavityCuts = layerSections
    .map((section) => {
      const cavityHeight = Math.max(internalLayer.height, 0.1);
      const rectangularCavity = translate(
        [
          section.x + section.dimensions.width / 2,
          section.y + section.dimensions.depth / 2,
          cavityHeight / 2
        ],
        cuboid({
          size: [
            section.dimensions.width + cavityOverlap * 2,
            section.dimensions.depth + cavityOverlap * 2,
            cavityHeight
          ],
          center: [0, 0, 0]
        })
      );

      const sourceGeometry = sectionReliefGeometryMap.get(section.section.id) ?? sectionGeometryMap.get(section.section.id);
      if (!sourceGeometry) {
        return [rectangularCavity];
      }

      try {
        const footprint = projectFootprint({}, sourceGeometry);
        const footprintBounds = rectangle({
          size: [section.dimensions.width, section.dimensions.depth],
          center: [section.dimensions.width / 2, section.dimensions.depth / 2]
        });
        const footprintDeficit = subtract(footprintBounds, footprint);
        const reliefDepth =
          section.section.type === 'counter' || section.section.type === 'playerBoard'
            ? Math.max(section.section.counterParams?.cutoutMax ?? 12, 4)
            : 16;
        const edgeProbe = 0.5;
        const adjacentBandThickness = 1;
        const minAdjacentFillLength = 4;
        const outerReliefClearance = 0.2;
        const layerBounds2D = rectangle({
          size: [internalLayer.width, internalLayer.depth],
          center: [internalLayer.width / 2, internalLayer.depth / 2]
        });
        const innerLayerBounds2D =
          internalLayer.width > outerReliefClearance * 2 && internalLayer.depth > outerReliefClearance * 2
            ? rectangle({
                size: [
                  internalLayer.width - outerReliefClearance * 2,
                  internalLayer.depth - outerReliefClearance * 2
                ],
                center: [internalLayer.width / 2, internalLayer.depth / 2]
              })
            : layerBounds2D;
        const otherSectionRects = layerSections
          .filter((other) => other.section.id !== section.section.id)
          .map((other) =>
            translate(
              [other.x + other.dimensions.width / 2, other.y + other.dimensions.depth / 2],
              rectangle({
                size: [
                  other.dimensions.width + cavityOverlap * 2,
                  other.dimensions.depth + cavityOverlap * 2
                ],
                center: [0, 0]
              })
            )
          );

        const sideReliefs = edgeReliefEnabled
          ? [
              {
                axis: 'vertical' as const,
                isOuterBoundary: section.x <= 0.01,
                probe: rectangle({
                  size: [edgeProbe, section.dimensions.depth],
                  center: [edgeProbe / 2, section.dimensions.depth / 2]
                }),
                adjacentBand: translate(
                  [section.x - adjacentBandThickness / 2, section.y + section.dimensions.depth / 2],
                  rectangle({
                    size: [adjacentBandThickness, section.dimensions.depth],
                    center: [0, 0]
                  })
                ),
                mirroredBandGlobal: translate(
                  [section.x - reliefDepth / 2, section.y + section.dimensions.depth / 2],
                  rectangle({
                    size: [reliefDepth, section.dimensions.depth],
                    center: [0, 0]
                  })
                ),
                outerBoundaryProbeGlobal: rectangle({
                  size: [edgeProbe, internalLayer.depth],
                  center: [edgeProbe / 2, internalLayer.depth / 2]
                }),
                band: rectangle({
                  size: [reliefDepth, section.dimensions.depth],
                  center: [reliefDepth / 2, section.dimensions.depth / 2]
                }),
                origin: [0, 0, 0] as [number, number, number],
                normal: [1, 0, 0] as [number, number, number]
              },
              {
                axis: 'vertical' as const,
                isOuterBoundary: section.x + section.dimensions.width >= internalLayer.width - 0.01,
                probe: rectangle({
                  size: [edgeProbe, section.dimensions.depth],
                  center: [section.dimensions.width - edgeProbe / 2, section.dimensions.depth / 2]
                }),
                adjacentBand: translate(
                  [
                    section.x + section.dimensions.width + adjacentBandThickness / 2,
                    section.y + section.dimensions.depth / 2
                  ],
                  rectangle({
                    size: [adjacentBandThickness, section.dimensions.depth],
                    center: [0, 0]
                  })
                ),
                mirroredBandGlobal: translate(
                  [section.x + section.dimensions.width + reliefDepth / 2, section.y + section.dimensions.depth / 2],
                  rectangle({
                    size: [reliefDepth, section.dimensions.depth],
                    center: [0, 0]
                  })
                ),
                outerBoundaryProbeGlobal: rectangle({
                  size: [edgeProbe, internalLayer.depth],
                  center: [internalLayer.width - edgeProbe / 2, internalLayer.depth / 2]
                }),
                band: rectangle({
                  size: [reliefDepth, section.dimensions.depth],
                  center: [section.dimensions.width - reliefDepth / 2, section.dimensions.depth / 2]
                }),
                origin: [section.dimensions.width, 0, 0] as [number, number, number],
                normal: [1, 0, 0] as [number, number, number]
              },
              {
                axis: 'horizontal' as const,
                isOuterBoundary: section.y <= 0.01,
                probe: rectangle({
                  size: [section.dimensions.width, edgeProbe],
                  center: [section.dimensions.width / 2, edgeProbe / 2]
                }),
                adjacentBand: translate(
                  [section.x + section.dimensions.width / 2, section.y - adjacentBandThickness / 2],
                  rectangle({
                    size: [section.dimensions.width, adjacentBandThickness],
                    center: [0, 0]
                  })
                ),
                mirroredBandGlobal: translate(
                  [section.x + section.dimensions.width / 2, section.y - reliefDepth / 2],
                  rectangle({
                    size: [section.dimensions.width, reliefDepth],
                    center: [0, 0]
                  })
                ),
                outerBoundaryProbeGlobal: rectangle({
                  size: [internalLayer.width, edgeProbe],
                  center: [internalLayer.width / 2, edgeProbe / 2]
                }),
                band: rectangle({
                  size: [section.dimensions.width, reliefDepth],
                  center: [section.dimensions.width / 2, reliefDepth / 2]
                }),
                origin: [0, 0, 0] as [number, number, number],
                normal: [0, 1, 0] as [number, number, number]
              },
              {
                axis: 'horizontal' as const,
                isOuterBoundary: section.y + section.dimensions.depth >= internalLayer.depth - 0.01,
                probe: rectangle({
                  size: [section.dimensions.width, edgeProbe],
                  center: [section.dimensions.width / 2, section.dimensions.depth - edgeProbe / 2]
                }),
                adjacentBand: translate(
                  [
                    section.x + section.dimensions.width / 2,
                    section.y + section.dimensions.depth + adjacentBandThickness / 2
                  ],
                  rectangle({
                    size: [section.dimensions.width, adjacentBandThickness],
                    center: [0, 0]
                  })
                ),
                mirroredBandGlobal: translate(
                  [section.x + section.dimensions.width / 2, section.y + section.dimensions.depth + reliefDepth / 2],
                  rectangle({
                    size: [section.dimensions.width, reliefDepth],
                    center: [0, 0]
                  })
                ),
                outerBoundaryProbeGlobal: rectangle({
                  size: [internalLayer.width, edgeProbe],
                  center: [internalLayer.width / 2, internalLayer.depth - edgeProbe / 2]
                }),
                band: rectangle({
                  size: [section.dimensions.width, reliefDepth],
                  center: [section.dimensions.width / 2, section.dimensions.depth - reliefDepth / 2]
                }),
                origin: [0, section.dimensions.depth, 0] as [number, number, number],
                normal: [0, 1, 0] as [number, number, number]
              }
            ]
              .map(
                ({
                  axis,
                  isOuterBoundary,
                  probe,
                  adjacentBand,
                  mirroredBandGlobal,
                  outerBoundaryProbeGlobal,
                  band,
                  origin,
                  normal
                }) => {
                  if (isOuterBoundary) {
                    return null;
                  }
                  let availableAdjacentFill = intersect(adjacentBand, layerBounds2D);
                  if (measureArea(availableAdjacentFill) <= 0.001) {
                    return null;
                  }
                  if (otherSectionRects.length > 0) {
                    availableAdjacentFill = subtract(availableAdjacentFill, ...otherSectionRects);
                    if (measureArea(availableAdjacentFill) <= 0.001) {
                      return null;
                    }
                  }
                  if (measureArea(availableAdjacentFill) < adjacentBandThickness * minAdjacentFillLength) {
                    return null;
                  }
                  let availableMirroredFill = intersect(mirroredBandGlobal, layerBounds2D);
                  if (measureArea(availableMirroredFill) <= 0.001) {
                    return null;
                  }
                  if (otherSectionRects.length > 0) {
                    availableMirroredFill = subtract(availableMirroredFill, ...otherSectionRects);
                    if (measureArea(availableMirroredFill) <= 0.001) {
                      return null;
                    }
                  }
                  const mirroredFillTouchesOuterBoundary = intersect(availableMirroredFill, outerBoundaryProbeGlobal);
                  if (measureArea(mirroredFillTouchesOuterBoundary) > 0.001) {
                    return null;
                  }
                  const edgeTouch = intersect(footprintDeficit, probe);
                  if (measureArea(edgeTouch) <= 0.001) {
                    return null;
                  }
                  const sideDeficit = intersect(footprintDeficit, band);
                  if (measureArea(sideDeficit) <= 0.01) {
                    return null;
                  }
                  const [[minX, minY], [maxX, maxY]] = measureBoundingBox(edgeTouch);
                  const spanPadding = 0.5;
                  const directionalTouchMask =
                    axis === 'vertical'
                      ? rectangle({
                          size: [
                            reliefDepth,
                            Math.max(maxY - minY + spanPadding * 2, edgeProbe)
                          ],
                          center: [
                            origin[0] === 0 ? reliefDepth / 2 : section.dimensions.width - reliefDepth / 2,
                            (minY + maxY) / 2
                          ]
                        })
                      : rectangle({
                          size: [
                            Math.max(maxX - minX + spanPadding * 2, edgeProbe),
                            reliefDepth
                          ],
                          center: [
                            (minX + maxX) / 2,
                            origin[1] === 0 ? reliefDepth / 2 : section.dimensions.depth - reliefDepth / 2
                          ]
                        });
                  const touchingDeficit = intersect(footprintDeficit, directionalTouchMask);
                  const effectiveDeficit = measureArea(touchingDeficit) > 0.01 ? touchingDeficit : sideDeficit;
                  const expandedDeficit = expand(
                    { delta: cavityOverlap, corners: 'round', segments: 16 },
                    effectiveDeficit
                  );
                  const mirroredRelief = mirror({ origin, normal }, expandedDeficit);
                  const mirroredBand = mirror({ origin, normal }, band);
                  const clippedMirroredRelief = intersect(mirroredRelief, mirroredBand);
                  const clippedReliefGlobal = translate(
                    [section.x, section.y],
                    clippedMirroredRelief
                  );
                  const reliefWithinFill = intersect(clippedReliefGlobal, availableMirroredFill, innerLayerBounds2D);
                  if (measureArea(reliefWithinFill) <= 0.01) {
                    return null;
                  }
                  return translate([-section.x, -section.y], reliefWithinFill);
                }
              )
              .filter((entry): entry is Geom2 => entry !== null)
          : [];

        if (sideReliefs.length === 0) {
          return [rectangularCavity];
        }

        return [
          rectangularCavity,
          translate(
            [section.x, section.y, 0],
            extrudeLinear({ height: cavityHeight }, union(...sideReliefs))
          )
        ];
      } catch {
        return [rectangularCavity];
      }
    })
    .flat();

  return cavityCuts.length > 0 ? subtract(outerBlock, ...cavityCuts) : outerBlock;
}

export function createLayeredBoxInternalLayerAssemblyGeometry(
  options: LayeredBoxInternalLayerGeometryOptions
): Geom3 | null {
  const placedSectionGeometries = options.layerSections
    .map((section) => {
      const geometry = options.sectionGeometryMap.get(section.section.id);
      return geometry ? translate([section.x, section.y, 0], geometry) : null;
    })
    .filter((geometry): geometry is Geom3 => geometry !== null);

  const fillGeometry = createLayeredBoxInternalLayerFillGeometry(options);
  const parts = fillGeometry ? [fillGeometry, ...placedSectionGeometries] : placedSectionGeometries;

  if (parts.length === 0) {
    return null;
  }
  if (parts.length === 1) {
    return parts[0];
  }
  return union(...parts);
}
