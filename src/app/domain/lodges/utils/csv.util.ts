// one CSV cell; a leading = + - @ is neutralised so spreadsheets never run it as a formula
export function csvCell(value: unknown): string {
  let text = value === null || value === undefined ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export const toCsv = (rows: unknown[][]): string =>
  rows.map((row) => row.map(csvCell).join(',')).join('\r\n');
