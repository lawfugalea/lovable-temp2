export const NOTE_COLORS = ['yellow', 'green', 'blue', 'purple', 'pink', 'gray'] as const;

const MAX_DOCUMENT_DEPTH = 50;
const MAX_DOCUMENT_NODES = 10_000;
const SAFE_LINK_PROTOCOLS = new Set(['http:', 'https:', 'mailto:', 'tel:']);

function isSafeLink(value: unknown): boolean {
  if (typeof value !== 'string' || !value.trim() || value.length > 2048) return false;
  const link = value.trim();
  if (link.startsWith('/') && !link.startsWith('//')) return true;
  if (link.startsWith('#') || link.startsWith('?')) return true;
  try {
    return SAFE_LINK_PROTOCOLS.has(new URL(link).protocol);
  } catch {
    return false;
  }
}

function validateDocumentStructure(value: Record<string, unknown>): string | null {
  const pending: Array<{ value: unknown; depth: number }> = [{ value, depth: 0 }];
  let nodes = 0;

  while (pending.length) {
    const current = pending.pop()!;
    if (current.depth > MAX_DOCUMENT_DEPTH) return 'Note document is too deeply nested';
    if (current.value === null || typeof current.value !== 'object') continue;
    nodes += 1;
    if (nodes > MAX_DOCUMENT_NODES) return 'Note document contains too many nodes';

    if (Array.isArray(current.value)) {
      for (const child of current.value) pending.push({ value: child, depth: current.depth + 1 });
      continue;
    }

    const object = current.value as Record<string, unknown>;
    if ('type' in object && typeof object.type !== 'string') return 'Note document contains an invalid node type';
    if ('text' in object && typeof object.text !== 'string') return 'Note document contains invalid text';
    if (object.attrs && typeof object.attrs === 'object' && !Array.isArray(object.attrs)) {
      const attrs = object.attrs as Record<string, unknown>;
      if ('href' in attrs && !isSafeLink(attrs.href)) return 'Note document contains an unsafe link';
      for (const key of Object.keys(attrs)) {
        if (/^on/i.test(key) || key.toLowerCase() === 'style') {
          return 'Note document contains an unsafe attribute';
        }
      }
    }
    for (const child of Object.values(object)) {
      pending.push({ value: child, depth: current.depth + 1 });
    }
  }
  return null;
}

export function validateOptionalText(
  value: unknown,
  field: string,
  maxLength: number,
): string | null {
  if (value === undefined) return null;
  if (typeof value !== 'string') return `${field} must be text`;
  if (value.length > maxLength) return `${field} must be ${maxLength} characters or fewer`;
  return null;
}

export function validateContentJson(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'object' || Array.isArray(value)) return 'Note document must be a JSON object';
  try {
    if (Buffer.byteLength(JSON.stringify(value), 'utf8') > 500_000) {
      return 'Note document is too large';
    }
  } catch {
    return 'Note document is invalid';
  }
  return validateDocumentStructure(value as Record<string, unknown>);
}

export function validateNoteColor(value: unknown): string | null {
  if (value === undefined) return null;
  return typeof value === 'string' && (NOTE_COLORS as readonly string[]).includes(value)
    ? null
    : 'Invalid note color';
}

export function validateOptionalBoolean(value: unknown, field: string): string | null {
  return value === undefined || typeof value === 'boolean' ? null : `${field} must be true or false`;
}
