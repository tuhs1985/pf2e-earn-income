export const DEFAULT_SHEET_COLUMNS = [
  'Activity', 'Date', 'Character', 'Description', 'Status', 'Task Level',
  'DC', 'Assured?', 'Roll Result',
  'Discord roll link', 'Income (gp)', 'Skill', 'Proficiency', 'Days', 'Start date', 'DC Mod', 'DC Adjustment',
] as const;
export type SheetColumn = { id: number | string; label: string; enabled: boolean; negative?: boolean };
export type SheetLayout = SheetColumn[];
const numericIds = new Set([5, 6, 8, 10, 13, 16]);
export const isNumericSheetColumn = (id: SheetColumn['id']) => typeof id === 'number' && numericIds.has(id);
export const defaultSheetLayout = (): SheetLayout => [0, 1, 2, 3, 4, 5, 15, 6, 7, 8, 9, 10, 11, 12, 13, 14, 16].map(id => ({ id, label: DEFAULT_SHEET_COLUMNS[id], enabled: id < 9 || id === 15 }));

export function validateSheetLayout(value: unknown): SheetLayout {
  if (!Array.isArray(value) || value.length < 9 || value.length > DEFAULT_SHEET_COLUMNS.length + 20) throw new Error('This sheet layout has the wrong columns.');
  const columns = value.map((entry): SheetColumn => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) throw new Error('Invalid sheet column.');
    const { id, label, enabled, negative } = entry as Partial<SheetColumn>;
    const base = typeof id === 'number' && Number.isInteger(id) && id >= 0 && id < DEFAULT_SHEET_COLUMNS.length;
    const blank = typeof id === 'string' && /^blank-[1-9]\d{0,8}$/.test(id);
    if ((!base && !blank) || typeof label !== 'string' || label.length > 60 || /[\p{Cc}\u2028\u2029]/u.test(label) ||
      (base && !label.trim()) || (blank && label !== '') || typeof enabled !== 'boolean' ||
      (negative !== undefined && (typeof negative !== 'boolean' || !isNumericSheetColumn(id!)))) throw new Error('Invalid sheet column.');
    return { id: id!, label: label.trim(), enabled, ...(negative === undefined ? {} : { negative }) };
  });
  const baseIds = columns.filter(c => typeof c.id === 'number').map(c => c.id as number);
  if (new Set(columns.map(c => c.id)).size !== columns.length || ![9, 10, 15, 16, DEFAULT_SHEET_COLUMNS.length].includes(baseIds.length) ||
    baseIds.some(id => id >= baseIds.length) || columns.length - baseIds.length > 20 || !columns.some(c => c.enabled)) {
    throw new Error('Include every supported column once and show at least one.');
  }
  for (let id = baseIds.length; id < DEFAULT_SHEET_COLUMNS.length; id++) columns.push({ id, label: DEFAULT_SHEET_COLUMNS[id], enabled: false });
  return columns;
}
export function parseSheetLayout(text: string): SheetLayout {
  if (new TextEncoder().encode(text).length > 100_000) throw new Error('This layout file is too large.');
  let data;
  try { data = JSON.parse(text); } catch { throw new Error('Choose a valid JSON sheet layout.'); }
  if (data?.app !== 'pf2e-earn-income' || data?.version !== 1) throw new Error('Choose a sheet layout exported by Earn Income.');
  return validateSheetLayout(data.columns);
}
export function serializeSheetLayout(columns: SheetLayout): string {
  return JSON.stringify({ app: 'pf2e-earn-income', version: 1, columns: validateSheetLayout(columns) }, null, 2);
}
export function safeSheetCell(value: string | number): string {
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '';
  const text = value.replace(/[\p{Cc}\u2028\u2029]+/gu, ' ').trim();
  return /^[=+\-@]/.test(text) ? `'${text}` : text;
}
export function formatLayoutRow(row: string, columns: SheetLayout): string {
  const cells = row.split('\t');
  return columns.filter(c => c.enabled).map(c => {
    const value = typeof c.id === 'number' ? cells[c.id] ?? '' : '';
    if (!c.negative || !isNumericSheetColumn(c.id) || value === '') return value;
    const number = Number(value);
    return Number.isFinite(number) ? String(-number) : value;
  }).join('\t');
}
export function formatLayoutWithHeaders(row: string, columns: SheetLayout): string {
  return columns.filter(c => c.enabled).map(c => safeSheetCell(c.label)).join('\t') + '\n' + formatLayoutRow(row, columns);
}
