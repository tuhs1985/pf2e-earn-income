// PF2e Earn Income automation utility
// ------------------------------------------------------------
// This module converts the Earn Income table (CRB p.228) into
// program‑friendly data, calculates payouts for any combination
// of results, and formats a Discord‑ready summary string.

// ----- Types -------------------------------------------------
export type Proficiency = "trained" | "expert" | "master" | "legendary";
export type Result = "criticalSuccess" | "success" | "failure" | "criticalFailure";

export interface IncomeTableRow {
  level: number;               // Task level (0‑20)
  dc: number;                  // DC to achieve Success
  payouts: [number, number, number, number, number];
  //      [failure, trained, expert, master, legendary] as copper pieces
}

// ----- Data --------------------------------------------------
// 1 cp = 1, 1 sp = 10, 1 gp = 100 (Pathfinder currency ratio)
const cp = (c: number) => c;
const sp = (s: number) => s * 10;
const gp = (g: number) => g * 100;

const T: IncomeTableRow[] = [
  { level: 0,  dc: 14, payouts: [cp(1),  cp(5),     cp(5),     cp(5),     cp(5)] },
  { level: 1,  dc: 15, payouts: [cp(2),  sp(2),     sp(2),     sp(2),     sp(2)] },
  { level: 2,  dc: 16, payouts: [cp(4),  sp(3),     sp(3),     sp(3),     sp(3)] },
  { level: 3,  dc: 18, payouts: [cp(8),  sp(5),     sp(5),     sp(5),     sp(5)] },
  { level: 4,  dc: 19, payouts: [sp(1),  sp(7),     sp(8),     sp(8),     sp(8)] },
  { level: 5,  dc: 20, payouts: [sp(2),  sp(9),     gp(1),     gp(1),     gp(1)] },
  { level: 6,  dc: 22, payouts: [sp(3),  gp(1)+sp(5), gp(2),   gp(2),   gp(2)] },
  { level: 7,  dc: 23, payouts: [sp(4),  gp(2),     gp(2)+sp(5), gp(2)+sp(5), gp(2)+sp(5)] },
  { level: 8,  dc: 24, payouts: [sp(5),  gp(2)+sp(5), gp(3),   gp(3),   gp(3)] },
  { level: 9,  dc: 26, payouts: [sp(6),  gp(3),     gp(4),     gp(4),     gp(4)] },
  { level:10,  dc: 27, payouts: [sp(7),  gp(4),     gp(5),     gp(6),     gp(6)] },
  { level:11,  dc: 28, payouts: [sp(8),  gp(5),     gp(6),     gp(8),     gp(8)] },
  { level:12,  dc: 30, payouts: [sp(9),  gp(6),     gp(8),     gp(10),    gp(10)] },
  { level:13,  dc: 31, payouts: [gp(1),  gp(7),     gp(10),    gp(15),    gp(15)] },
  { level:14,  dc: 32, payouts: [gp(1)+sp(5), gp(8), gp(15),   gp(20),    gp(20)] },
  { level:15,  dc: 34, payouts: [gp(2), gp(10),     gp(20),    gp(28),    gp(28)] },
  { level:16,  dc: 35, payouts: [gp(2)+sp(5), gp(13), gp(25),  gp(36),    gp(40)] },
  { level:17,  dc: 36, payouts: [gp(3), gp(15),     gp(30),    gp(45),    gp(55)] },
  { level:18,  dc: 38, payouts: [gp(4), gp(20),     gp(45),    gp(70),    gp(90)] },
  { level:19,  dc: 39, payouts: [gp(6), gp(30),     gp(60),    gp(100),   gp(130)] },
  { level:20,  dc: 40, payouts: [gp(8), gp(40),     gp(75),    gp(150),   gp(200)] },
];

const critical20: Record<Proficiency, number> = {
  trained:   gp(50),
  expert:    gp(90),
  master:    gp(175),
  legendary: gp(300),
};

function proficiencyIndex(p: Proficiency): number {
  return ["trained", "expert", "master", "legendary"].indexOf(p) + 1;
}

export function dailyEarnings(level: number, prof: Proficiency, result: Result): number {
  if (result === "criticalFailure") return 0;
  if (level === 20 && result === "criticalSuccess") {
    return critical20[prof];
  }
  const row = T.find(r => r.level === (result === "criticalSuccess" ? level + 1 : level));
  if (!row) throw new Error(`No income row for level ${level}`);
  const col = result === "failure" ? 0 : proficiencyIndex(prof);
  return row.payouts[col];
}

export interface DayResultCounts {
  criticalSuccess: number;
  success: number;
  failure: number;
  criticalFailure: number;
}

export interface DiscordSummaryInput {
  character: string;
  endDate: string;       // YYYY-MM-DD
  days: number;          // Downtime days used
  skill: string;
  description: string;
  taskLevel: number;
  proficiency: Proficiency;
  counts: DayResultCounts;
  rollsLink: string;
  hasExperiencedProfessional?: boolean;
  applyOneResultToAllDays?: boolean;
}

function countsForDays(
  counts: DayResultCounts,
  days: number,
  applyOneResultToAllDays = false
): DayResultCounts {
  const resultKeys: Result[] = ["criticalSuccess", "success", "failure", "criticalFailure"];
  if (!Number.isSafeInteger(days) || days < 1) {
    throw new Error("Enter a positive whole number of downtime days.");
  }
  if (resultKeys.some(key => !Number.isSafeInteger(counts[key]) || counts[key] < 0)) {
    throw new Error("Result counts must be nonnegative whole numbers.");
  }
  const total = resultKeys.reduce((sum, key) => sum + counts[key], 0);
  if (applyOneResultToAllDays) {
    if (total !== 1) {
      throw new Error("To apply one result to all downtime days, enter 1 in exactly one result field and leave the others blank or 0.");
    }
    const result = resultKeys.find(key => counts[key] === 1)!;
    return { ...counts, [result]: days };
  }
  if (total !== days) {
    throw new Error(`Daily result counts (${total}) must equal the number of downtime days (${days}).`);
  }
  return { ...counts };
}

export function totalEarnings(
  level: number,
  prof: Proficiency,
  counts: DayResultCounts,
  hasEP = false
): number {
  const adjustedCounts = counts;
  let earnings = 0;
  earnings += adjustedCounts.criticalSuccess * dailyEarnings(level, prof, "criticalSuccess");
  earnings += adjustedCounts.success * dailyEarnings(level, prof, "success");

  const failureEarnings = dailyEarnings(level, prof, "failure");
  const isExpertOrHigher = (prof === "expert" || prof === "master" || prof === "legendary");

  if (hasEP) {
    // Upgraded critical failures: always single failure payout, never doubled
    earnings += adjustedCounts.criticalFailure * failureEarnings;
    // Original failures: doubled only for expert or higher
    if (isExpertOrHigher) {
      earnings += adjustedCounts.failure * failureEarnings * 2;
    } else {
      earnings += adjustedCounts.failure * failureEarnings;
    }
  } else {
    // No EP: all failures are paid as single failures, never doubled
    earnings += adjustedCounts.failure * failureEarnings;
    // Critical failures earn nothing
  }

  return earnings;
}
function copperToString(cpValue: number): string {
  const gpPart = Math.floor(cpValue / 100);
  const spPart = Math.floor((cpValue % 100) / 10);
  const cpPart = cpValue % 10;
  const parts: string[] = [];
  if (gpPart) parts.push(`${gpPart} gp`);
  if (spPart) parts.push(`${spPart} sp`);
  if (cpPart) parts.push(`${cpPart} cp`);
  return parts.join(", ");
}

export function getTodayDateString(today = new Date()): string {
  // toISOString() and parsing YYYY-MM-DD as a Date both use UTC.
  // Build the date input's value directly from the user's local calendar.
  return `${today.getFullYear()}`.padStart(4, "0") + "-" +
    `${today.getMonth() + 1}`.padStart(2, "0") + "-" +
    `${today.getDate()}`.padStart(2, "0");
}

function formatMMDD(date: Date): string {
  return `${date.getMonth() + 1}`.padStart(2, "0") + "/" + `${date.getDate()}`.padStart(2, "0");
}

function parseLocalDate(dateStr: string, label = "end date"): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    throw new Error(`Enter a valid ${label}.`);
  }
  const [year, month, day] = dateStr.split('-').map(Number);
  // Local noon avoids midnight clock changes; setFullYear preserves years 1-99.
  const date = new Date(0);
  date.setHours(12, 0, 0, 0);
  date.setFullYear(year, month - 1, day);
  if (year < 1 || date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    throw new Error(`Enter a valid ${label}.`);
  }
  return date;
}

export type PeriodField = "startDate" | "days" | "endDate";
export interface PeriodState {
  startDate: string;
  days: string;
  endDate: string;
  edited: PeriodField[];
  error: string;
}

export function updatePeriod(previous: PeriodState, field: PeriodField, value: string): PeriodState {
  const next = { ...previous, [field]: value, error: "" };
  const fields: PeriodField[] = ["startDate", "days", "endDate"];
  next.edited = [field, ...previous.edited.filter(key => key !== field)];
  // Prefer the latest explicit input; fall back to an existing calculated value.
  const other = [...next.edited, ...fields].find(key => key !== field && next[key] !== "");
  if (!value || !other) return next;
  const derived = fields.find(key => key !== field && key !== other)!;
  try {
    if (derived === "days") {
      const start = parseLocalDate(next.startDate, "start date");
      const end = parseLocalDate(next.endDate);
      // Compare calendar labels on a neutral day counter, without DST offsets.
      const dayNumber = (date: Date) => {
        const counter = new Date(0);
        counter.setUTCFullYear(date.getFullYear(), date.getMonth(), date.getDate());
        return counter.getTime() / 86400000;
      };
      const days = dayNumber(end) - dayNumber(start) + 1;
      if (days < 1) throw new Error("End date must be on or after start date.");
      next.days = String(days);
    } else {
      const days = Number(next.days);
      if (!Number.isSafeInteger(days) || days < 1) throw new Error("Enter a positive whole number of downtime days.");
      const anchor = derived === "startDate" ? parseLocalDate(next.endDate) : parseLocalDate(next.startDate, "start date");
      anchor.setDate(anchor.getDate() + (derived === "startDate" ? -1 : 1) * (days - 1));
      if (isNaN(anchor.getTime()) || anchor.getFullYear() < 1 || anchor.getFullYear() > 9999) {
        throw new Error("The downtime period extends beyond the supported date range.");
      }
      next[derived] = getTodayDateString(anchor);
    }
  } catch (error) {
    next[derived] = "";
    next.error = error instanceof Error ? error.message : "Enter a valid downtime period.";
  }
  return next;
}

function calculateStartDate(endDate: string, days: number): string {
  const end = parseLocalDate(endDate);
  const start = new Date(end);
  // Subtract calendar days, not 24-hour intervals, across daylight-saving changes.
  start.setDate(end.getDate() - (days - 1));
  if (isNaN(start.getTime()) || start.getFullYear() < 1) {
    throw new Error("The downtime period extends beyond the supported date range.");
  }
  return formatMMDD(start);
}
export function buildDiscordSummary(data: DiscordSummaryInput): string {
  const dc = T.find(r => r.level === data.taskLevel)?.dc ?? 0;
  const dailyCounts = countsForDays(data.counts, data.days, data.applyOneResultToAllDays);
  const money = copperToString(totalEarnings(data.taskLevel, data.proficiency, dailyCounts, data.hasExperiencedProfessional));
  const { counts } = data;
  const startDate = calculateStartDate(data.endDate, data.days);
  const endDate = formatMMDD(parseLocalDate(data.endDate));

  const adjustedFailures = counts.failure + (data.hasExperiencedProfessional ? counts.criticalFailure : 0);
  const remainingCritFailures = data.hasExperiencedProfessional ? 0 : counts.criticalFailure;

  // Conditionally include result counts only if greater than zero
  const resultsArray = [];
  if (counts.criticalSuccess > 0) {
    resultsArray.push(`${counts.criticalSuccess} × Critical Successes`);
  }
  if (counts.success > 0) {
    resultsArray.push(`${counts.success} × Successes`);
  }
  if (adjustedFailures > 0) {
    resultsArray.push(`${adjustedFailures} × Failures`);
  }
  if (remainingCritFailures > 0) {
    resultsArray.push(`${remainingCritFailures} × Critical Failures`);
  }
  const resultsLine = resultsArray.length > 0
    ? `**Results:** ${resultsArray.join(", ")}`
    : `**Results:** None`;

  return [
    `**Character:** ${data.character}`,
    `**Days:** ${startDate} - ${endDate}`,
    `**Skill Used:** ${data.skill}`,
    `> *${data.description}*`,
    `**Task Level Attempted:** ${capitalize(data.proficiency)} Level ${data.taskLevel}; **DC** ${dc}`,
    resultsLine,
    data.applyOneResultToAllDays ? `*One result applied to all ${data.days} downtime days*` : undefined,
    `**Link:** ${data.rollsLink}`,
    `**Money Earned:** ${money}`,
    data.hasExperiencedProfessional ? `*Experienced Professional applied*` : undefined,
  ].filter(Boolean).join("\n");
}
function capitalize(s: string): string { return s.slice(0,1).toUpperCase() + s.slice(1); }
