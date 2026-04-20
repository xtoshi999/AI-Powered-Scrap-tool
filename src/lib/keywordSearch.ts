/**
 * Escape a string for use inside a MongoDB / JS RegExp (literal substring match).
 */
export function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Split keyword input into AND terms. Separates on ` AND ` (case-insensitive) only
 * **outside** double-quoted regions, so phrases can contain the word "and".
 * Optional double quotes around a segment are stripped.
 *
 * Examples:
 * - `react AND typescript` → ["react", "typescript"]
 * - `is not set a idea AND fullstack` → ["is not set a idea", "fullstack"]
 * - `"is not set a idea" AND "fullstack"` → ["is not set a idea", "fullstack"]
 */
export function parseKeywordAndTerms(raw: string | null | undefined): string[] {
  if (raw == null) return [];
  const s = raw.trim();
  if (!s) return [];

  const segments: string[] = [];
  let start = 0;
  let inQuote = false;
  let i = 0;

  while (i < s.length) {
    if (s[i] === '"') {
      inQuote = !inQuote;
      i++;
      continue;
    }
    if (!inQuote) {
      const rest = s.slice(i);
      const m = rest.match(/^(\s+AND\s+)/i);
      if (m) {
        segments.push(s.slice(start, i).trim());
        i += m[1].length;
        start = i;
        continue;
      }
    }
    i++;
  }
  segments.push(s.slice(start).trim());

  return segments
    .map((seg) => {
      let t = seg.trim();
      if (t.length >= 2 && t.startsWith('"') && t.endsWith('"')) {
        t = t.slice(1, -1);
      }
      return t.trim();
    })
    .filter((t) => t.length > 0);
}
