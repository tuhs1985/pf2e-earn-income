import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

// Load the actual utility without writing compiled files or changing dist.
const source = readFileSync(new URL('../src/utils/earnIncome.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
});
const { totalEarnings, buildDiscordSummary, getTodayDateString, updatePeriod } = await import(
  `data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`
);
const empty = { criticalSuccess: 0, success: 0, failure: 0, criticalFailure: 0 };
const input = (counts, overrides = {}) => ({
  character: 'Test', endDate: '2026-09-12', days: 7, skill: 'Lore',
  description: 'Work', taskLevel: 1, proficiency: 'trained', rollsLink: '',
  counts: { ...empty, ...counts }, ...overrides,
});

test('daily counts are never silently expanded', () => {
  assert.equal(totalEarnings(1, 'trained', { ...empty, success: 3 }), 60);
  assert.match(buildDiscordSummary(input({ success: 7 })), /Money Earned:\*\* 1 gp, 4 sp/);
  assert.match(buildDiscordSummary(input({ success: 3, failure: 4 })), /Money Earned:\*\* 6 sp, 8 cp/);
});

test('daily mode rejects missing, incomplete, and excess counts', () => {
  for (const counts of [{}, { success: 1 }, { success: 3 }, { success: 3, failure: 1 }, { success: 8 }]) {
    assert.throws(() => buildDiscordSummary(input(counts)), /must equal/);
  }
});

test('period mode applies exactly one result and explains its coverage', () => {
  const summary = buildDiscordSummary(input({ success: 1 }, { applyOneResultToAllDays: true }));
  assert.match(summary, /Money Earned:\*\* 1 gp, 4 sp/);
  assert.match(summary, /1 × Successes/);
  assert.match(summary, /One result applied to all 7 downtime days/);
  for (const counts of [{}, { success: 3 }, { success: 1, failure: 1 }]) {
    assert.throws(() => buildDiscordSummary(input(counts, { applyOneResultToAllDays: true })), /exactly one result/);
  }
});

test('both modes reject invalid days and counts', () => {
  for (const applyOneResultToAllDays of [false, true]) {
    for (const days of [0, -1, 1.5, NaN, Infinity]) {
      assert.throws(() => buildDiscordSummary(input({ success: 1 }, { days, applyOneResultToAllDays })), /positive whole/);
    }
    for (const success of [-1, 0.5, NaN, Infinity]) {
      assert.throws(() => buildDiscordSummary(input({ success }, { applyOneResultToAllDays })), /nonnegative whole/);
    }
  }
});

test('period payouts preserve critical successes and Experienced Professional rules', () => {
  const summary = (counts, overrides = {}) => buildDiscordSummary(input(counts, {
    applyOneResultToAllDays: true, proficiency: 'expert', hasExperiencedProfessional: true, ...overrides,
  }));
  assert.match(summary({ failure: 1 }), /Money Earned:\*\* 2 sp, 8 cp/);
  assert.match(summary({ criticalFailure: 1 }), /Money Earned:\*\* 1 sp, 4 cp/);
  assert.match(summary({ criticalSuccess: 1 }, { taskLevel: 20, proficiency: 'legendary' }), /Money Earned:\*\* 2100 gp/);
});

test('switching modes requires counts appropriate to the new mode', () => {
  const data = input({ success: 1 }, { applyOneResultToAllDays: true });
  buildDiscordSummary(data);
  assert.throws(() => buildDiscordSummary({ ...data, applyOneResultToAllDays: false }), /must equal/);
  assert.deepEqual(data.counts, { ...empty, success: 1 });
  const singleDay = input({ success: 1 }, { days: 1 });
  assert.match(buildDiscordSummary(singleDay), /Money Earned:\*\* 2 sp/);
});

test('today follows the local calendar on both sides of UTC midnight', () => {
  const previousTZ = process.env.TZ;
  try {
    for (const [zone, instant, expected] of [
      ['America/New_York', '2026-09-13T01:00:00Z', '2026-09-12'],
      ['America/New_York', '2026-09-13T04:01:00Z', '2026-09-13'],
      ['America/Los_Angeles', '2026-01-01T02:00:00Z', '2025-12-31'],
      ['Asia/Tokyo', '2026-09-12T16:00:00Z', '2026-09-13'],
      ['Pacific/Auckland', '2025-12-31T12:00:00Z', '2026-01-01'],
    ]) {
      process.env.TZ = zone;
      assert.equal(getTodayDateString(new Date(instant)), expected, zone);
    }
  } finally {
    if (previousTZ === undefined) delete process.env.TZ;
    else process.env.TZ = previousTZ;
  }
});

test('date ranges retain calendar days across DST, leap days, and year boundaries', () => {
  const previousTZ = process.env.TZ;
  try {
    for (const zone of ['America/New_York', 'America/Los_Angeles', 'Asia/Tokyo', 'Pacific/Auckland', 'UTC']) {
      process.env.TZ = zone;
      for (const [endDate, days, expected] of [
        ['2026-03-09', 3, '03/07 - 03/09'],
        ['2026-11-02', 3, '10/31 - 11/02'],
        ['2024-03-01', 2, '02/29 - 03/01'],
        ['2026-01-02', 4, '12/30 - 01/02'],
        ['2026-09-12', 1, '09/12 - 09/12'],
      ]) {
        const summary = buildDiscordSummary(input({ success: 1 }, { endDate, days, applyOneResultToAllDays: true }));
        assert.ok(summary.includes(`**Days:** ${expected}`), `${zone}: ${endDate}`);
      }
    }
  } finally {
    if (previousTZ === undefined) delete process.env.TZ;
    else process.env.TZ = previousTZ;
  }
});

test('empty, malformed, and impossible end dates produce a useful error', () => {
  for (const endDate of ['', '2026-02-29', '2026-04-31', '2026-13-01', '2026-00-10', '2026-09-00', '0000-01-01', '09/12/2026', '2026-09-12T00:00:00Z']) {
    assert.throws(() => buildDiscordSummary(input({ success: 7 }, { endDate })), /Enter a valid end date/);
  }
});

const blankPeriod = () => ({ startDate: '', days: '', endDate: '', edited: [], error: '' });
test('any pair of downtime fields calculates the third in either entry order', () => {
  const values = { startDate: '2026-09-01', days: '7', endDate: '2026-09-07' };
  for (const first of Object.keys(values)) {
    for (const second of Object.keys(values).filter(key => key !== first)) {
      const result = updatePeriod(updatePeriod(blankPeriod(), first, values[first]), second, values[second]);
      for (const key of Object.keys(values)) assert.equal(result[key], values[key], `${first}, ${second}: ${key}`);
      assert.equal(result.error, '');
    }
  }
});

test('latest two edits stay authoritative and clearing allows a new pair', () => {
  let state = updatePeriod(blankPeriod(), 'endDate', '2026-09-07');
  state = updatePeriod(state, 'days', '7');
  assert.equal(state.startDate, '2026-09-01');
  state = updatePeriod(state, 'startDate', '2026-09-02');
  assert.equal(state.endDate, '2026-09-08');
  state = updatePeriod(state, 'endDate', '2026-09-10');
  assert.equal(state.days, '9');
  state = updatePeriod(state, 'endDate', '');
  assert.equal(state.endDate, '');
  state = updatePeriod(state, 'days', '3');
  assert.equal(state.endDate, '2026-09-04');
});

test('period calculator handles inclusive dates and DST in multiple time zones', () => {
  const previousTZ = process.env.TZ;
  try {
    for (const zone of ['America/New_York', 'America/Los_Angeles', 'Asia/Tokyo', 'Pacific/Auckland']) {
      process.env.TZ = zone;
      for (const [startDate, days, endDate] of [
        ['2026-03-07', '3', '2026-03-09'],
        ['2026-10-31', '3', '2026-11-02'],
        ['2024-02-28', '3', '2024-03-01'],
        ['2025-12-31', '2', '2026-01-01'],
        ['2026-09-12', '1', '2026-09-12'],
      ]) {
        let state = updatePeriod(updatePeriod(blankPeriod(), 'startDate', startDate), 'endDate', endDate);
        assert.equal(state.days, days, zone);
        state = updatePeriod(updatePeriod(blankPeriod(), 'days', days), 'startDate', startDate);
        assert.equal(state.endDate, endDate, zone);
        state = updatePeriod(updatePeriod(blankPeriod(), 'days', days), 'endDate', endDate);
        assert.equal(state.startDate, startDate, zone);
        const summary = buildDiscordSummary(input({ success: 1 }, { days: Number(days), endDate: state.endDate, applyOneResultToAllDays: true }));
        assert.ok(summary.includes(`**Days:** ${startDate.slice(5).replace('-', '/')} - ${endDate.slice(5).replace('-', '/')}`));
      }
    }
  } finally {
    if (previousTZ === undefined) delete process.env.TZ;
    else process.env.TZ = previousTZ;
  }
});

test('invalid periods clear the calculated field and recover when corrected', () => {
  let state = updatePeriod(updatePeriod(blankPeriod(), 'startDate', '2026-09-12'), 'endDate', '2026-09-11');
  assert.match(state.error, /on or after/);
  assert.equal(state.days, '');
  state = updatePeriod(state, 'endDate', '2026-09-13');
  assert.equal(state.days, '2');
  assert.equal(state.error, '');
  for (const days of ['0', '-1', '1.5', 'Infinity']) {
    const invalid = updatePeriod(updatePeriod(blankPeriod(), 'startDate', '2026-09-12'), 'days', days);
    assert.match(invalid.error, /positive whole/);
    assert.equal(invalid.endDate, '');
  }
  assert.match(updatePeriod(updatePeriod(blankPeriod(), 'startDate', '9999-12-31'), 'days', '2').error, /supported date range/);
  assert.match(updatePeriod(updatePeriod(blankPeriod(), 'endDate', '0001-01-01'), 'days', '2').error, /supported date range/);
});
