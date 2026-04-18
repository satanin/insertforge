export function sanitizeExportName(name: string, fallback = 'item'): string {
  const sanitized = name
    .toLowerCase()
    .replace(/[/\\]+/g, '-')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  return sanitized || fallback;
}
