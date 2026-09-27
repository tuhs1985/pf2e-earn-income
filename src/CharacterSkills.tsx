import type { SkillDraft } from './utils/characterProfiles';
import type { Proficiency } from './utils/earnIncome';
import PopoverHelp from './PopoverHelp';

export default function CharacterSkills({ skills, selected, onChange }: {
  skills: SkillDraft[]; selected: number; onChange: (skills: SkillDraft[], selected: number) => void;
}) {
  const active = skills[selected];
  const update = (patch: Partial<SkillDraft>) => onChange(skills.map((skill, index) => index === selected ? { ...skill, ...patch } : skill), selected);
  return <div className="character-skills">
    <div className="result-mode-row">
      <label>Skill Used<select value={selected} onChange={e => onChange(skills, Number(e.target.value))}>
        {skills.map((skill, index) => <option key={index} value={index}>{skill.name || `Unnamed skill ${index + 1}`}</option>)}
      </select></label>
      <PopoverHelp label="Help with character skills">
        Choose one skill for this job. Edit its name, modifier, and proficiency below, or add another skill.
        Save stores all skills under the character name; edits are not saved automatically.
        The modifier supplies rolled checks unless you enter a per-check override. Known totals and Assurance are entered separately.
      </PopoverHelp>
    </div>
    <label>Skill name<input type="text" value={active.name} maxLength={100} placeholder="e.g. Sailing Lore" onChange={e => update({ name: e.target.value })} /></label>
    <div className="form-row">
      <label>Skill modifier<input type="number" min={-1000} max={1000} value={active.modifier} placeholder="e.g. 12" onChange={e => update({ modifier: e.target.value })} /></label>
      <label>Proficiency<select value={active.proficiency} onChange={e => update({ proficiency: e.target.value as Proficiency })}>
        <option value="trained">Trained</option><option value="expert">Expert</option><option value="master">Master</option><option value="legendary">Legendary</option>
      </select></label>
    </div>
    <label><input type="checkbox" checked={active.experienced} onChange={e => update({ experienced: e.target.checked })} />Experienced Professional (Lore only)</label>
    <div className="character-picker-actions">
      <button type="button" disabled={skills.length >= 50} onClick={() => onChange([...skills, { name: '', modifier: '', proficiency: 'trained', experienced: false }], skills.length)}>Add Skill</button>
      <button type="button" disabled={skills.length === 1} onClick={() => {
        if (window.confirm(`Remove ${active.name || 'this skill'} from the current character? Save afterward to update the stored profile.`)) onChange(skills.filter((_, index) => index !== selected), Math.max(0, selected - 1));
      }}>Remove Skill</button>
    </div>
  </div>;
}
