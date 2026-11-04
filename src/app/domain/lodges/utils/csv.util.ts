// primitives and dates only; anything else would print as [object Object]
const cellText = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') return value;
  if (
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    typeof value === 'bigint'
  ) {
    return String(value);
  }
  return JSON.stringify(value);
};

// one CSV cell; a leading = + - @ is neutralised so spreadsheets never run it as a formula
export function csvCell(value: unknown): string {
  let text = cellText(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export const toCsv = (rows: unknown[][]): string =>
  rows.map((row) => row.map(csvCell).join(',')).join('\r\n');
