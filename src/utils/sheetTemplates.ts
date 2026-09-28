import { defaultSheetLayout, validateSheetLayout, type SheetLayout } from './sheetLayout';
export type SheetTemplate = { name: string; layout: SheetLayout };
export type SheetSettings = { templates: SheetTemplate[]; active: string; layout: SheetLayout };
const key = (name: string) => name.trim().toLowerCase();
export function validateSheetTemplates(value: unknown): SheetTemplate[] {
  if (!Array.isArray(value) || !value.length || value.length > 10) throw new Error('A character can have up to 10 sheet templates.');
  const templates = value.map((entry): SheetTemplate => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) throw new Error('Invalid sheet template.');
    const { name, layout } = entry as Partial<SheetTemplate>;
    if (typeof name !== 'string' || !name.trim() || name.length > 50 || /[\p{Cc}\u2028\u2029]/u.test(name)) throw new Error('Use a template name of 1–50 characters.');
    return { name: key(name) === 'default' ? 'Default' : name.trim(), layout: validateSheetLayout(layout) };
  });
  if (!templates.some(t => t.name === 'Default') || new Set(templates.map(t => key(t.name))).size !== templates.length) throw new Error('Templates need unique names and a Default template.');
  return templates;
}
export function loadSheetSettings(profile: { sheetLayout?: SheetLayout; sheetTemplates?: SheetTemplate[]; activeSheetTemplate?: string } = {}): SheetSettings {
  const templates = validateSheetTemplates(profile.sheetTemplates ?? [{ name: 'Default', layout: profile.sheetLayout ?? defaultSheetLayout() }]);
  const active = templates.find(t => key(t.name) === key(profile.activeSheetTemplate ?? 'Default'));
  if (!active) throw new Error('Select a saved sheet template.');
  return { templates, active: active.name, layout: active.layout };
}
export function savedSheetSettings(settings: SheetSettings, newName?: string): SheetSettings {
  const name = newName === undefined ? settings.active : newName.trim();
  if (newName !== undefined && settings.templates.some(t => key(t.name) === key(name))) throw new Error('That template name is already in use.');
  const layout = validateSheetLayout(settings.layout);
  const templates = validateSheetTemplates(newName === undefined
    ? settings.templates.map(t => t.name === name ? { ...t, layout } : t)
    : [...settings.templates, { name, layout }]);
  return loadSheetSettings({ sheetTemplates: templates, activeSheetTemplate: name });
}
export const sheetSettingsDirty = (settings: SheetSettings) =>
  JSON.stringify(settings.layout) !== JSON.stringify(settings.templates.find(t => t.name === settings.active)?.layout);
