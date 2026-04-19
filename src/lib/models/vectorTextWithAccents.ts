import jscad from '@jscad/modeling';

type VectorTextSegments = ReturnType<typeof jscad.text.vectorText>;
type AccentKind = 'acute' | 'tilde' | 'diaeresis';

const { vectorText } = jscad.text;

const ACCENTED_CHAR_MAP: Record<string, { base: string; accent: AccentKind }> = {
  Á: { base: 'A', accent: 'acute' },
  É: { base: 'E', accent: 'acute' },
  Í: { base: 'I', accent: 'acute' },
  Ó: { base: 'O', accent: 'acute' },
  Ú: { base: 'U', accent: 'acute' },
  À: { base: 'A', accent: 'acute' },
  È: { base: 'E', accent: 'acute' },
  Ì: { base: 'I', accent: 'acute' },
  Ò: { base: 'O', accent: 'acute' },
  Ù: { base: 'U', accent: 'acute' },
  Ä: { base: 'A', accent: 'diaeresis' },
  Ë: { base: 'E', accent: 'diaeresis' },
  Ï: { base: 'I', accent: 'diaeresis' },
  Ö: { base: 'O', accent: 'diaeresis' },
  Ü: { base: 'U', accent: 'diaeresis' },
  Ñ: { base: 'N', accent: 'tilde' }
};

function getBounds(segments: VectorTextSegments): { minX: number; maxX: number; minY: number; maxY: number } | null {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const segment of segments) {
    for (const point of segment) {
      minX = Math.min(minX, point[0]);
      maxX = Math.max(maxX, point[0]);
      minY = Math.min(minY, point[1]);
      maxY = Math.max(maxY, point[1]);
    }
  }

  if (!Number.isFinite(minX) || !Number.isFinite(maxX) || !Number.isFinite(minY) || !Number.isFinite(maxY)) {
    return null;
  }

  return { minX, maxX, minY, maxY };
}

function translateSegments(segments: VectorTextSegments, offsetX: number, offsetY: number): VectorTextSegments {
  return segments.map((segment) => segment.map((point) => [point[0] + offsetX, point[1] + offsetY]));
}

function createAccentSegments(
  accent: AccentKind,
  glyphLeft: number,
  glyphWidth: number,
  glyphTop: number,
  height: number
): VectorTextSegments {
  const centerX = glyphLeft + glyphWidth / 2;
  const baseY = glyphTop + height * 0.18;

  if (accent === 'acute') {
    const accentWidth = Math.max(height * 0.16, 0.8);
    const accentHeight = Math.max(height * 0.22, 1);
    return [[[centerX - accentWidth * 0.3, baseY], [centerX + accentWidth * 0.7, baseY + accentHeight]]];
  }

  if (accent === 'tilde') {
    const waveWidth = Math.max(height * 0.34, 1.6);
    const waveHeight = Math.max(height * 0.08, 0.5);
    return [[
      [centerX - waveWidth / 2, baseY + waveHeight * 0.2],
      [centerX - waveWidth / 6, baseY + waveHeight],
      [centerX + waveWidth / 6, baseY],
      [centerX + waveWidth / 2, baseY + waveHeight * 0.8]
    ]];
  }

  const dotGap = Math.max(height * 0.08, 0.5);
  const dotWidth = Math.max(height * 0.08, 0.45);
  const dotHeight = Math.max(height * 0.05, 0.35);
  return [
    [[centerX - dotGap - dotWidth, baseY], [centerX - dotGap, baseY + dotHeight]],
    [[centerX + dotGap, baseY], [centerX + dotGap + dotWidth, baseY + dotHeight]]
  ];
}

export function vectorTextWithAccents({
  height,
  text,
  letterSpacing = 0.22
}: {
  height: number;
  text: string;
  letterSpacing?: number;
}): VectorTextSegments {
  const source = text.toUpperCase();

  // Preserve original JSCAD text generation for plain ASCII strings.
  // This keeps the same geometry as upstream Counter Slayer unless we
  // actually need custom accent handling.
  if (![...source].some((char) => char in ACCENTED_CHAR_MAP)) {
    return vectorText({ height, align: 'left' }, source);
  }

  const allSegments: VectorTextSegments = [];
  let cursorX = 0;

  for (const char of source) {
    if (char === ' ') {
      cursorX += height * 0.45;
      continue;
    }

    const accentEntry = ACCENTED_CHAR_MAP[char];
    const glyphChar = accentEntry?.base ?? char;
    const glyphSegments = vectorText({ height, align: 'left' }, glyphChar);
    const glyphBounds = getBounds(glyphSegments);

    if (!glyphBounds) {
      cursorX += height * 0.3;
      continue;
    }

    const placedGlyphSegments = translateSegments(glyphSegments, cursorX - glyphBounds.minX, 0);
    allSegments.push(...placedGlyphSegments);

    const glyphWidth = glyphBounds.maxX - glyphBounds.minX;
    if (accentEntry) {
      allSegments.push(
        ...createAccentSegments(
          accentEntry.accent,
          cursorX,
          glyphWidth,
          glyphBounds.maxY,
          height
        )
      );
    }

    cursorX += glyphWidth + height * letterSpacing;
  }

  return allSegments;
}
