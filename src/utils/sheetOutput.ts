import { countsForDays, getTodayDateString, resolveCheck, resultLabels, taskDC, totalEarnings } from './earnIncome';
import type { DiscordSummaryInput, IncomeCheck, Result } from './earnIncome';
import { safeSheetCell } from './sheetLayout';

// One generated downtime period is one row. No combined roll-total cell.
export function formatSheetRow(input: DiscordSummaryInput, checks?: IncomeCheck[]): string {
  const counts = countsForDays(input.counts, input.days, input.applyOneResultToAllDays);
  const income = totalEarnings(input.taskLevel, input.proficiency, counts, input.hasExperiencedProfessional) / 100;
  const displayed = { ...counts };
  if (input.hasExperiencedProfessional) {
    displayed.failure += displayed.criticalFailure;
    displayed.criticalFailure = 0;
  }
  const outcomes = (Object.keys(displayed) as Result[]).filter(key => displayed[key] > 0);
  const status = outcomes.length === 1 ? resultLabels[outcomes[0]] : outcomes.map(key => `${displayed[key]} x ${resultLabels[key]}`).join('; ');
  const assured = checks?.length ? checks.every(c => c.method === 'assurance') ? 'TRUE' : checks.some(c => c.method === 'assurance') ? 'Mixed' : 'FALSE' : '';
  const total = checks?.length === 1 ? resolveCheck(checks[0], input.taskLevel, input.dcAdjustment).total : '';
  const [year, month, day] = input.endDate.split('-').map(Number);
  const start = new Date(0);
  start.setHours(12, 0, 0, 0);
  start.setFullYear(year, month - 1, day - input.days + 1);
  return [
    'Earn Income', input.endDate, input.character, input.description, status, input.taskLevel,
    taskDC(input.taskLevel, input.dcAdjustment), assured, total, input.rollsLink,
    income, input.skill, input.proficiency, input.days, getTodayDateString(start), input.dcAdjustmentLabel ?? (input.dcAdjustment || ''), input.dcAdjustment ?? 0,
  ].map(safeSheetCell).join('\t');
}
