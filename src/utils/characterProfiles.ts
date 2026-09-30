import { parseSkillModifier } from './earnIncome';
import type { Proficiency } from './earnIncome';
import { validateSheetLayout, type SheetLayout } from './sheetLayout';
import { loadSheetSettings, type SheetTemplate } from './sheetTemplates';

export type CharacterSkill = { name: string; modifier: number | string; proficiency: Proficiency; experienced: boolean };
export type CharacterProfile = { name: string; skills: CharacterSkill[]; selectedSkill: number;
  sheetLayout?: SheetLayout; sheetTemplates?: SheetTemplate[]; activeSheetTemplate?: string };
export type SkillDraft = Omit<CharacterSkill, 'modifier'> & { modifier: string };
export const storageKey = 'pf2e-earn-income.characters.v1';
export const profileKey = (name: string) => name.trim().toLowerCase();
const maxBytes = 1024 * 1024;
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

export function validateProfile(value: unknown): CharacterProfile {
  if (!isRecord(value) || typeof value.name !== 'string' || !value.name.trim() || value.name.length > 200) {
    throw new Error('Enter a character name (up to 200 characters).');
  }
  if (!Array.isArray(value.skills) || value.skills.length < 1 || value.skills.length > 50) {
    throw new Error('Each character needs between 1 and 50 skills.');
  }
  const skills = value.skills.map((skill): CharacterSkill => {
    if (!isRecord(skill) || typeof skill.name !== 'string' || !skill.name.trim() || skill.name.length > 100 ||
      (typeof skill.modifier !== 'number' && typeof skill.modifier !== 'string') ||
      typeof skill.proficiency !== 'string' || !['trained', 'expert', 'master', 'legendary'].includes(skill.proficiency) ||
      typeof skill.experienced !== 'boolean') {
      throw new Error('Each skill needs a name, a whole modifier from -1000 to 1000, a proficiency rank, and a valid feat setting.');
    }
    parseSkillModifier(String(skill.modifier));
    return { name: skill.name.trim(), modifier: skill.modifier, proficiency: skill.proficiency as Proficiency, experienced: skill.experienced };
  });
  if (new Set(skills.map(skill => profileKey(skill.name))).size !== skills.length) throw new Error('Use a different name for each skill.');
  if (typeof value.selectedSkill !== 'number' || !Number.isInteger(value.selectedSkill) || value.selectedSkill < 0 || value.selectedSkill >= skills.length) {
    throw new Error('Choose a skill for this character.');
  }
  const profile: CharacterProfile = { name: value.name.trim(), skills, selectedSkill: value.selectedSkill };
  if (value.sheetLayout !== undefined) profile.sheetLayout = validateSheetLayout(value.sheetLayout);
  if (value.sheetTemplates !== undefined) {
    if (typeof value.activeSheetTemplate !== 'string') throw new Error('Select a saved sheet template.');
    const settings = loadSheetSettings({ sheetTemplates: value.sheetTemplates as SheetTemplate[], activeSheetTemplate: value.activeSheetTemplate });
    profile.sheetTemplates = settings.templates;
    profile.activeSheetTemplate = settings.active;
    profile.sheetLayout = settings.layout;
  } else if (value.activeSheetTemplate !== undefined) throw new Error('The selected sheet template is missing.');
  return profile;
}

export function profileFromDraft(name: string, skills: SkillDraft[], selectedSkill: number): CharacterProfile {
  return validateProfile({ name, selectedSkill, skills: skills.map(skill => ({ ...skill, modifier: /^[-+]?\d+$/.test(skill.modifier.trim()) ? Number(skill.modifier) : skill.modifier })) });
}

export function parseProfiles(text: string): CharacterProfile[] {
  if (new TextEncoder().encode(text).length > maxBytes) throw new Error('This backup is too large (maximum 1 MB).');
  let data: unknown;
  try { data = JSON.parse(text); } catch { throw new Error('Choose a valid JSON character backup exported by Earn Income.'); }
  if (!isRecord(data) || data.app !== 'pf2e-earn-income' || data.version !== 1 || !Array.isArray(data.characters) || data.characters.length > 1000) {
    throw new Error('Choose a character backup exported by Earn Income (version 1).');
  }
  const profiles = data.characters.map(validateProfile);
  if (new Set(profiles.map(p => profileKey(p.name))).size !== profiles.length) throw new Error('The backup contains duplicate character names.');
  return profiles;
}

export function serializeProfiles(characters: CharacterProfile[]): string {
  const text = JSON.stringify({ app: 'pf2e-earn-income', version: 1, characters: characters.map(validateProfile) }, null, 2);
  parseProfiles(text); // Enforce the same size and duplicate limits on saves and merged imports.
  return text;
}

export function mergeProfiles(existing: CharacterProfile[], incoming: CharacterProfile[]): CharacterProfile[] {
  const names = new Set(incoming.map(p => profileKey(p.name)));
  return [...existing.filter(p => !names.has(profileKey(p.name))), ...incoming];
}
