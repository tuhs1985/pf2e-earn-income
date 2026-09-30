import { newCheck, copperToString, resolveCheck, resultLabels, taskDC, totalEarnings } from "./utils/earnIncome";
import type { IncomeCheck, Proficiency } from "./utils/earnIncome";
import PopoverHelp from "./PopoverHelp";


export default function CheckList({ checks, onChange, days, level, proficiency, experienced, defaultModifier, dcAdjustment }: {
  checks: IncomeCheck[]; onChange: (checks: IncomeCheck[]) => void; days: number;
  level: number; dcAdjustment: number; proficiency: Proficiency; experienced: boolean; defaultModifier: string;
}) {
  const update = (id: number, patch: Partial<IncomeCheck>) => onChange(checks.map(row => row.id === id ? { ...row, ...patch } : row));
  const assigned = checks.reduce((sum, row) => sum + (row.days === null ? days : Number(row.days) || 0), 0);
  let dc = "—";
  try { dc = String(taskDC(level, dcAdjustment)); } catch { /* Task input is incomplete. */ }
  return <div className="check-list">
    <div className="result-mode-row">
      <span className="check-progress" aria-live="polite">{assigned} of {days || "—"} days assigned · DC {dc}</span>
      <PopoverHelp label="Help with check entries">
        Each check covers one or more days. The first check uses all downtime days until you edit its days or add a check.
        Adding a check preserves existing allocations. Adjust days so the total matches your downtime period.
        <br /><br />Enter the actual d20 face to detect natural 1 and 20 automatically. For a known total, select the die status yourself.
        Assurance uses 10 + proficiency bonus, with no other modifiers or natural-die adjustment.
        Rolled checks use the selected character skill modifier unless a Modifier override is entered. Clear an override to use the character modifier again.
      </PopoverHelp>
    </div>
    {checks.map((row, index) => {
      let feedback = "Enter the check to see its result.";
      let valid = false;
      try {
        const resolved = resolveCheck({ ...row, modifier: row.modifier || defaultModifier }, level, dcAdjustment);
        const covered = row.days === null ? days : Number(row.days);
        const daily = totalEarnings(level, proficiency, { criticalSuccess: 0, success: 0, failure: 0, criticalFailure: 0, [resolved.result]: 1 }, experienced);
        feedback = `${resolved.total} vs DC ${dc} · ${resultLabels[resolved.result]}`;
        if (experienced && resolved.result === "criticalFailure") feedback += " → Failure (Experienced Professional)";
        feedback += ` · ${copperToString(daily)}/day`;
        if (Number.isSafeInteger(covered) && covered > 0) feedback += ` · ${copperToString(daily * covered)} total`;
        valid = true;
      } catch { /* Display guidance until the row is complete; submit gives precise errors. */ }
      return <fieldset className="check-card" key={row.id}>
        <legend>Check {index + 1}</legend>
        <div className="check-pair">
        <label>Days covered<input type="number" required min={1} value={row.days === null ? days || "" : row.days} onChange={e => update(row.id, { days: e.target.value })} /></label>
        <label>Method<select value={row.method} onChange={e => update(row.id, { method: e.target.value as IncomeCheck["method"], total: "", natural: "normal" })}>
          <option value="rolled">d20 + modifier</option><option value="total">Known roll total</option><option value="assurance">Assurance</option>
        </select></label>
        </div>
        {row.method === "rolled" ? <div className="check-pair">
          <label>d20 face<input type="number" required min={1} max={20} value={row.die} placeholder="1–20" onChange={e => update(row.id, { die: e.target.value })} /></label>
          <label>Modifier override<input type="text" maxLength={200} value={row.modifier} placeholder={defaultModifier || "Set skill modifier"} onChange={e => update(row.id, { modifier: e.target.value })} /></label>
        </div> : <div className={row.method === "total" ? "check-pair" : undefined}>
          <label>{row.method === "assurance" ? "Assurance total" : "Roll total"}<input type="number" required value={row.total} placeholder={row.method === "assurance" ? "10 + proficiency bonus" : "Total including modifiers"} onChange={e => update(row.id, { total: e.target.value })} /></label>
          {row.method === "total" && <label>Die status<select value={row.natural} onChange={e => update(row.id, { natural: e.target.value as IncomeCheck["natural"] })}>
            <option value="normal">Normal (2–19)</option><option value="1">Natural 1</option><option value="20">Natural 20</option>
          </select></label>}
        </div>}
        <div className="check-allocation">
          {checks.length > 1 && <button type="button" aria-label={`Remove check ${index + 1}`} onClick={() => onChange(checks.filter(check => check.id !== row.id))}>Remove</button>}
        </div>
        <p className={valid ? "check-result" : "check-hint"} aria-live="polite">{feedback}</p>
      </fieldset>;
    })}
    <button type="button" className="add-check" onClick={() => onChange([
      ...checks.map(row => row.days === null ? { ...row, days: days ? String(days) : "" } : row),
      { ...newCheck(Math.max(...checks.map(row => row.id)) + 1), days: "" },
    ])}>+ Add Check</button>
    {days > 0 && assigned !== days && <p className="check-hint">Assign exactly {days} days across your checks before generating.</p>}
  </div>;
}
