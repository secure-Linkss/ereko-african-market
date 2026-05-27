/**
 * Strips keys whose value is null or undefined from a plain object (shallow).
 * Useful when mapping Prisma records to API response shapes.
 */
export function stripNulls<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== null && v !== undefined),
  ) as Partial<T>;
}
