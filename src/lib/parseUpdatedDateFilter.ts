/**
 * Parses "updated from" filter values.
 * Accepts day/month/year (e.g. 15/4/2026) or ISO YYYY-MM-DD.
 * Returns UTC midnight at the start of that calendar day — profiles with
 * updatedAt >= this value are included (i.e. updated on or after that date).
 */
export function parseUpdatedDateFromInput(input: string): Date | null {
  const s = input.trim();
  if (!s) return null;

  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) {
    const y = parseInt(iso[1], 10);
    const m = parseInt(iso[2], 10);
    const d = parseInt(iso[3], 10);
    if (m < 1 || m > 12 || d < 1 || d > 31) return null;
    const t = Date.UTC(y, m - 1, d, 0, 0, 0, 0);
    const check = new Date(t);
    if (
      check.getUTCFullYear() !== y ||
      check.getUTCMonth() !== m - 1 ||
      check.getUTCDate() !== d
    ) {
      return null;
    }
    return check;
  }

  const dmy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!dmy) return null;
  const day = parseInt(dmy[1], 10);
  const month = parseInt(dmy[2], 10);
  const year = parseInt(dmy[3], 10);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const t = Date.UTC(year, month - 1, day, 0, 0, 0, 0);
  const check = new Date(t);
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day
  ) {
    return null;
  }
  return check;
}
