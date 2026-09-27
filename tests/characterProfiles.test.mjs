import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';
const source = readFileSync(new URL('../src/utils/characterProfiles.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } });
const { validateProfile, parseProfiles, serializeProfiles, mergeProfiles, profileFromDraft } = await import('data:text/javascript;base64,' + Buffer.from(outputText).toString('base64'));
const a = { name: 'Alice', selectedSkill: 0, skills: [{ name: 'Sailing Lore', modifier: 12, proficiency: 'expert', experienced: true }] };
test('profile round trip strips unrelated and executable-looking fields', () => {
  const clean = parseProfiles(serializeProfiles([{ ...a, days: 7, html: '<script>x</script>', skills: [{ ...a.skills[0], script: 'x' }] }]));
  assert.deepEqual(clean, [a]);
  assert.equal(validateProfile({ ...a, name: '<script>alert(1)</script>' }).name, '<script>alert(1)</script>');
});
test('new names preserve old profiles; matching names replace only their profile', () => {
  const b = { ...a, name: 'Bob' };
  assert.equal(mergeProfiles([a], [b]).length, 2);
  assert.deepEqual(mergeProfiles([a, b], [{ ...a, name: ' ALICE ', skills: [{ ...a.skills[0], modifier: 15 }] }])[0], b);
});
test('strict import and draft validation rejects malformed data', () => {
  for (const text of ['oops', 'null', JSON.stringify({version:1,characters:[a]}), JSON.stringify({app:'pf2e-crafting',version:1,characters:[a]})]) assert.throws(() => parseProfiles(text));
  for (const bad of [{...a, selectedSkill: 2}, {...a,skills:[]}, {...a,skills:[a.skills[0],a.skills[0]]}, {...a,skills:[{...a.skills[0],modifier:'12'}]}, {...a,skills:[{...a.skills[0],experienced:'true'}]}]) assert.throws(() => validateProfile(bad));
  assert.throws(() => serializeProfiles([a,{...a,name:' ALICE '}]));
  assert.throws(() => profileFromDraft('Alice',[{...a.skills[0],modifier:''}],0));
});
