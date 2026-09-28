import { useRef, useState } from 'react';
import { defaultSheetLayout, formatLayoutRow, formatLayoutWithHeaders, isNumericSheetColumn, parseSheetLayout, serializeSheetLayout, validateSheetLayout, type SheetColumn } from './utils/sheetLayout';
import { loadSheetSettings, savedSheetSettings, sheetSettingsDirty, type SheetSettings } from './utils/sheetTemplates';
import { parseProfiles, profileKey, serializeProfiles, storageKey } from './utils/characterProfiles';
import useInteractionNotice from './useInteractionNotice';
import './SheetOutput.css';

export default function SheetOutput({ summary, row, character, owner, settings, onChange }: {
  summary: string; row: string; character: string; owner: string;
  settings: SheetSettings; onChange: (settings: SheetSettings) => void;
}) {
  const [mode, setMode] = useState<'summary' | 'sheet'>('summary');
  const [editing, setEditing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [notice, setNotice] = useInteractionNotice();
  const fileInput = useRef<HTMLInputElement>(null);
  const { layout, templates, active } = settings;
  const attempt = (action: () => void) => {
    try { action(); } catch (error) { setNotice(error instanceof Error ? error.message : 'Could not update the layout.'); }
  };
  const changeLayout = (next: typeof layout) => { setNotice(''); onChange({ ...settings, layout: next }); };
  const persist = (next: SheetSettings) => {
    if (!owner || owner !== profileKey(character)) throw new Error('Load or save this character first, then save the sheet template.');
    const text = localStorage.getItem(storageKey);
    const profiles = text ? parseProfiles(text) : [];
    const index = profiles.findIndex(p => profileKey(p.name) === owner);
    if (index < 0) throw new Error('Save this character first, then save the sheet template.');
    profiles[index] = { ...profiles[index], sheetLayout: next.layout, sheetTemplates: next.templates, activeSheetTemplate: next.active };
    localStorage.setItem(storageKey, serializeProfiles(profiles));
  };
  const save = () => attempt(() => {
    const next = savedSheetSettings(settings, creating ? newName : undefined);
    persist(next); onChange(next); setCreating(false); setNewName('');
    setNotice(`${next.active} template saved for ${character}.`);
  });
  const select = (name: string) => attempt(() => {
    if ((sheetSettingsDirty(settings) || creating) && !window.confirm('Discard unsaved changes to this sheet template?')) return;
    const next = loadSheetSettings({ sheetTemplates: templates, activeSheetTemplate: name });
    // Local selection works before the character is saved; saved profiles remember it.
    if (owner && owner === profileKey(character)) persist(next);
    onChange(next); setCreating(false); setNewName(''); setNotice('');
  });
  const remove = () => attempt(() => {
    if (active === 'Default' || !window.confirm(`Delete the ${active} template and any unsaved edits?`)) return;
    const next = loadSheetSettings({ sheetTemplates: templates.filter(t => t.name !== active), activeSheetTemplate: 'Default' });
    persist(next); onChange(next); setCreating(false); setNewName(''); setNotice('Sheet template deleted.');
  });
  const update = (id: SheetColumn['id'], patch: Partial<SheetColumn>) => changeLayout(layout.map(c => c.id === id ? { ...c, ...patch } : c));
  const move = (index: number, step: number) => {
    const next = [...layout];
    if (index + step < 0 || index + step >= next.length) return;
    [next[index], next[index + step]] = [next[index + step], next[index]];
    changeLayout(next);
  };
  const addBlank = () => {
    const ids = layout.filter(c => typeof c.id === 'string');
    if (ids.length >= 20) { setNotice('A layout can have up to 20 blank columns.'); return; }
    const id = Math.max(0, ...ids.map(c => Number(String(c.id).slice(6)))) + 1;
    changeLayout([...layout, { id: `blank-${id}`, label: '', enabled: true }]);
  };
  const copy = async (withHeaders = false) => {
    try {
      const value = mode === 'summary' ? summary : withHeaders
        ? formatLayoutWithHeaders(row, validateSheetLayout(layout)) : formatLayoutRow(row, validateSheetLayout(layout));
      await navigator.clipboard.writeText(value);
      setNotice(mode === 'summary' ? 'Summary copied.' : withHeaders ? 'Headers and row copied.' : 'Sheet row copied.');
    } catch { setNotice('Could not copy. Check clipboard permissions and try again.'); }
  };
  const exportLayout = () => attempt(() => {
    const url = URL.createObjectURL(new Blob([serializeSheetLayout(layout)], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = 'pf2e-earn-income-sheet-layout.json';
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    setNotice('Sheet layout download requested.');
  });
  const importLayout = async (file?: File) => {
    if (!file) return;
    try {
      if (file.size > 100_000) throw new Error('This layout file is too large.');
      const next = parseSheetLayout(await file.text());
      changeLayout(next); setEditing(true); setNotice('Layout imported. Save to keep it with this character.');
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Could not import layout.'); }
    finally { if (fileInput.current) fileInput.current.value = ''; }
  };
  const values = formatLayoutRow(row, layout).split('\t');
  return <div className="output-section">
    <div className="output-controls" role="group" aria-label="Output format">
      <button type="button" aria-pressed={mode === 'summary'} onClick={() => setMode('summary')}>Summary</button>
      <button type="button" aria-pressed={mode === 'sheet'} onClick={() => setMode('sheet')}>Sheet row</button>
      {mode === 'summary' && <button type="button" onClick={() => void copy()}>Copy summary</button>}
    </div>
    {mode === 'summary' ? <pre className="output-pre">{summary}</pre> : <>
      <div className="sheet-template-row">
        <label>Sheet template<select aria-label="Sheet template" value={active} onChange={e => select(e.target.value)}>
          {templates.map(t => <option key={t.name}>{t.name}</option>)}
        </select></label>
        <button type="button" disabled={templates.length >= 10 || creating} onClick={() => { setCreating(true); setNewName(''); setNotice(''); }}>New</button>
        <button type="button" disabled={active === 'Default' || creating} onClick={remove}>Delete</button>
      </div>
      {creating && <div className="sheet-template-new">
        <label>New template name<input maxLength={50} value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Campaign log" /></label>
        <button type="button" onClick={() => { setCreating(false); setNewName(''); }}>Cancel</button>
      </div>}
      <div className="sheet-layout-actions">
        <button type="button" aria-expanded={editing} onClick={() => setEditing(!editing)}>{editing ? 'Done editing' : 'Edit columns'}</button>
        {(editing || creating) && <button type="button" onClick={save}>Save</button>}
        {editing && <><button type="button" onClick={() => changeLayout(defaultSheetLayout())}>Reset</button><button type="button" onClick={addBlank}>Add blank column</button></>}
        <button type="button" onClick={() => void copy()}>Copy sheet row</button>
        <button type="button" onClick={() => void copy(true)}>Copy with headers</button>
        {editing && <><button type="button" onClick={exportLayout}>Export layout</button><button type="button" onClick={() => fileInput.current?.click()}>Import layout</button></>}
      </div>
      <input ref={fileInput} type="file" aria-label="Import sheet layout" accept=".json,application/json" hidden onChange={e => void importLayout(e.target.files?.[0])} />
      {editing && <div className="sheet-layout-editor" aria-label="Edit sheet columns">
        {layout.map((column, index) => <div className="sheet-layout-column" key={column.id}>
          <div className="sheet-layout-flags">
            <label className="sheet-layout-toggle"><input type="checkbox" aria-label={`Show ${column.label || 'blank column'}`} checked={column.enabled} disabled={column.enabled && layout.filter(c => c.enabled).length === 1} onChange={e => update(column.id, { enabled: e.target.checked })} />Show</label>
            {isNumericSheetColumn(column.id) && <label className="sheet-layout-toggle"><input type="checkbox" aria-label={`Negative ${column.label}`} checked={!!column.negative} onChange={e => update(column.id, { negative: e.target.checked })} />Negative</label>}
          </div>
          {typeof column.id === 'string' ? <span className="sheet-layout-blank">Blank column (empty cell)</span> : <label className="sheet-layout-name">Header<input aria-label={`Header ${column.id}`} maxLength={60} value={column.label} onChange={e => update(column.id, { label: e.target.value })} /></label>}
          <div className="sheet-layout-move">
            <button type="button" disabled={index === 0} aria-label={`Move ${column.label || 'blank column'} up`} onClick={() => move(index, -1)}>↑</button>
            <button type="button" disabled={index === layout.length - 1} aria-label={`Move ${column.label || 'blank column'} down`} onClick={() => move(index, 1)}>↓</button>
            {typeof column.id === 'string' && <button type="button" disabled={column.enabled && layout.filter(c => c.enabled).length === 1} aria-label="Remove blank column" onClick={() => changeLayout(layout.filter(c => c.id !== column.id))}>×</button>}
          </div>
        </div>)}
      </div>}
      <div className="sheet-preview" aria-label="Sheet row preview">
        {layout.filter(c => c.enabled).map((c, index) => <div className="sheet-preview-pair" key={c.id}>
          <span className="sheet-preview-label">{c.label || 'Blank column'}</span><span className="sheet-preview-value">{values[index]}</span>
        </div>)}
      </div>
    </>}
    {notice && <p className="sheet-layout-notice" role="status">{notice}</p>}
  </div>;
}
