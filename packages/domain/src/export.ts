export type CsvCell = string | number | boolean | null | undefined;
export type CsvRow = Record<string, CsvCell>;

function escape(value: CsvCell): string {
  if (value === null || value === undefined) return "";
  const s = typeof value === "string" ? value : String(value);
  if (s.includes(",") || s.includes("\"") || s.includes("\n") || s.includes("\r")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/**
 * Serialize an array of plain objects as CSV (RFC 4180-ish: quotes escaped by
 * doubling, fields containing commas/quotes/newlines are quoted, CRLF row
 * terminator). Column order is taken from the first row's keys, then any new
 * keys discovered in later rows are appended.
 */
export function toCsv(rows: CsvRow[], explicitColumns?: string[]): string {
  if (rows.length === 0 && !explicitColumns?.length) return "";
  const cols: string[] = explicitColumns ? [...explicitColumns] : [];
  if (!explicitColumns) {
    const seen = new Set<string>();
    for (const r of rows) {
      for (const k of Object.keys(r)) {
        if (!seen.has(k)) {
          seen.add(k);
          cols.push(k);
        }
      }
    }
  }
  const header = cols.map(escape).join(",");
  const body = rows.map((r) => cols.map((c) => escape(r[c])).join(",")).join("\r\n");
  return body ? `${header}\r\n${body}` : header;
}

export function moneyToDecimal(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}
