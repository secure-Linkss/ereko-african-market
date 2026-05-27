export function encodeCursor(id: string): string {
  return Buffer.from(id, 'utf8').toString('base64url');
}

export function decodeCursor(cursor: string): string {
  return Buffer.from(cursor, 'base64url').toString('utf8');
}

export function buildCursorWhere(cursor: string | undefined, field = 'id') {
  if (!cursor) return {};
  return { [field]: { gt: decodeCursor(cursor) } };
}
