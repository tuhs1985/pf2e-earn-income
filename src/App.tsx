import { useState, useEffect } from "react";
import { buildDiscordSummary, updatePeriod, checkCounts, newCheck } from "./utils/earnIncome";
import type { PeriodField, PeriodState } from "./utils/earnIncome";
import type { DiscordSummaryInput } from "./utils/earnIncome";
import "./App.css";
import PopoverHelp from "./PopoverHelp";
import CheckList from "./CheckList";
import SheetOutput from "./SheetOutput";
import { formatSheetRow } from "./utils/sheetOutput";
import { loadSheetSettings, sheetSettingsDirty } from "./utils/sheetTemplates";
import { profileKey } from "./utils/characterProfiles";
import CharacterSaves from "./CharacterSaves";
import CharacterSkills from "./CharacterSkills";
import type { SkillDraft } from "./utils/characterProfiles";
import type { IncomeCheck } from "./utils/earnIncome";

// PWA detection (matches Crafting App logic)
function useIsStandalone() {
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const checkStandalone = () =>
      window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: fullscreen)').matches ||
      // Safari exposes this optional property for installed web apps.
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

    setIsStandalone(checkStandalone());

    // Listen for changes to display-mode
    const mq = window.matchMedia('(display-mode: standalone)');
    const handler = () => setIsStandalone(checkStandalone());
    if (mq.addEventListener) {
      mq.addEventListener('change', handler);
    } else if (mq.addListener) {
      mq.addListener(handler);
    }
    return () => {
      if (mq.removeEventListener) {
        mq.removeEventListener('change', handler);
      } else if (mq.removeListener) {
        mq.removeListener(handler);
      }
    };
  }, []);

  return isStandalone;
}

export function ReturnButton() {
  const [expanded, setExpanded] = useState(false);

  // Only used for touch devices
  const handleTouchEnd = (e: React.TouchEvent<HTMLAnchorElement>) => {
    if (!expanded) {
      e.preventDefault();
      setExpanded(true);
    }
    // If already expanded, allow navigation
  };

  return (
    <a
      href="https://tools.tuhsrpg.com/"
      className={`return-btn${expanded ? " expanded" : ""}`}
      onTouchEnd={handleTouchEnd}
    >
      <span className="dots">&#8942;</span>
      <span className="arrow">&larr;</span>
      <span className="return-text">Return</span>
    </a>
  );
}

export default function App() {
  // Main state, broken out for clarity (parity with Crafting App)
  const [entryMode, setEntryMode] = useState<"checks" | "manual">("checks");
  const [checks, setChecks] = useState<IncomeCheck[]>([newCheck(1)]);
  const [character, setCharacter] = useState("");
  const [period, setPeriod] = useState<PeriodState>(() => ({
    startDate: "", days: "", endDate: "", edited: [], error: "",
  }));
  const { startDate, days, endDate } = period;
  const [skills, setSkills] = useState<SkillDraft[]>([{ name: "", modifier: "", proficiency: "trained", experienced: false }]);
  const [selectedSkill, setSelectedSkill] = useState(0);
  const activeSkill = skills[selectedSkill];
  const skill = activeSkill.name;
  const proficiency = activeSkill.proficiency;
  const hasExperiencedProfessional = activeSkill.experienced;
  const [description, setDescription] = useState("");
  const [difficulty, setDifficulty] = useState(0);
  const [manualDCAdjustment, setManualDCAdjustment] = useState("");
  const dcAdjustment = difficulty + Number(manualDCAdjustment);
  const [taskLevel, setTaskLevel] = useState<string>("");
  const [criticalSuccess, setCriticalSuccess] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [failure, setFailure] = useState<string>("");
  const [criticalFailure, setCriticalFailure] = useState<string>("");
  const [rollsLink, setRollsLink] = useState("");
  const [applyOneResultToAllDays, setApplyOneResultToAllDays] = useState(false);

  const [output, setOutput] = useState("");
  const [sheetRow, setSheetRow] = useState("");
  const [sheetSettings, setSheetSettings] = useState(() => loadSheetSettings());
  const [sheetOwner, setSheetOwner] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [showInstructions, setShowInstructions] = useState(false);

  const changePeriod = (field: PeriodField, value: string) => {
    setPeriod(previous => updatePeriod(previous, field, value));
    setOutput("");
    setError("");
    setCopied(false);
  };

  const clearPeriod = () => {
    setPeriod({ startDate: "", days: "", endDate: "", edited: [], error: "" });
    setOutput("");
    setError("");
    setCopied(false);
  };

  // PWA standalone detection
  const isStandalone = useIsStandalone();

  // Helper to package the input for the utility
  const buildInput = (): DiscordSummaryInput => ({
    character,
    endDate,
    days: Number(days),
    skill,
    description,
    taskLevel: taskLevel === "" ? 0 : Number(taskLevel),
    proficiency,
    dcAdjustment,
    dcAdjustmentLabel: manualDCAdjustment.trim() ? dcAdjustment : ({ [-10]: "Incredibly easy", [-5]: "Very easy", [-2]: "Easy", 0: "", 2: "Hard", 5: "Very hard", 10: "Incredibly hard" } as Record<number, string>)[difficulty],
    counts: {
      criticalSuccess: criticalSuccess === "" ? 0 : Number(criticalSuccess),
      success: success === "" ? 0 : Number(success),
      failure: failure === "" ? 0 : Number(failure),
      criticalFailure: criticalFailure === "" ? 0 : Number(criticalFailure),
    },
    rollsLink,
    hasExperiencedProfessional,
    applyOneResultToAllDays,
  });

  // Generate summary
  const handleGenerate = () => {
    setError(""); // Clear previous errors
    if (period.error || !startDate || !days || !endDate) {
      setError(period.error || "Enter any two of Start Date, Days, and End Date to complete the downtime period.");
      setOutput("");
      return;
    }
    try {
      const safeInput = buildInput();
      const effectiveChecks = checks.map(check => ({ ...check, modifier: check.modifier || activeSkill.modifier }));
      if (entryMode === "checks") {
        safeInput.counts = checkCounts(effectiveChecks, safeInput.taskLevel, safeInput.days, safeInput.dcAdjustment);
        safeInput.applyOneResultToAllDays = false;
      }
      const summary = buildDiscordSummary(safeInput);
      setSheetRow(formatSheetRow(safeInput, entryMode === "checks" ? effectiveChecks : undefined));
      setOutput(summary);
      navigator.clipboard?.writeText(summary).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }).catch(() => setCopied(false));
    } catch (err: unknown) {
      setError(err instanceof Error && err.message ? err.message : "An error occurred while generating the summary.");
      setOutput("");
    }
  };

  return (
    <div className="app-container">
      <div className="inner-container">
		<div className="header-container" style={{ position: "relative" }}>
		  {!isStandalone && (
			<ReturnButton />
		  )}
		  <h1 style={{ textAlign: "center", margin: 0 }}>PF2e Earn Income Generator</h1>
		</div>
        <div className="instructions-container">
          <button
            type="button"
            className="instructions-toggle"
            onClick={() => setShowInstructions((v) => !v)}
            aria-expanded={showInstructions}
            aria-controls="instructions-content"
          >
            {showInstructions ? "Hide Instructions" : "Show Instructions"}
          </button>
          {showInstructions && (
            <div className="instructions-content" id="instructions-content" style={{marginTop: "1em"}}>
              <h2>How to Use</h2>
              <details>
                <summary>Character &amp; saves</summary>
                <p>Enter a character name and add skills with their modifiers and proficiency. Skill Used selects the skill for this job. Enable Experienced Professional only when it applies.</p>
                <p>Save keeps character skills and sheet templates in this browser. Load restores them; Export and Import transfer backups between devices. Confirm before replacing a matching name. Work entries and rolls are not saved.</p>
              </details>
              <details>
                <summary>Downtime &amp; difficulty</summary>
                <p>Fill any two of Start Date, Days, and End Date. Both dates count; the two most recently edited fields calculate the third. Clear Dates resets the period.</p>
                <p>Enter the work description and task level. Difficulty and Manual DC Adj. add to the level-based DC for all checks, including Assurance. Blank values mean no adjustment. Payout rates still use task level.</p>
              </details>
              <details>
                <summary>Checks &amp; manual results</summary>
                <p>Check List accepts a d20 face plus modifier, a known roll total plus die status, or an Assurance total (10 + proficiency bonus). Rolled checks use the selected skill modifier unless overridden. Natural 1 and 20 change the outcome by one degree.</p>
                <p>Assign Days covered to each check; their total must match the period. Add Check supports multiple checks. Each completed check previews its result and earnings.</p>
                <p>Manual Counts accepts days for each outcome. To apply one outcome to the whole period, check Apply one result to all downtime days and enter 1 in exactly one outcome field.</p>
              </details>
              <details>
                <summary>Summary &amp; sheet row</summary>
                <p>Generate Summary displays Discord Markdown and attempts to copy it. An optional Discord rolls link makes the Results text clickable. Switch to Sheet row to copy tab-separated cells, with or without headers.</p>
                <p>Date is the end date; Income is total gp. DC Mod shows the difficulty name, stays blank at the default, or shows the combined adjustment when a manual value is entered. Optional DC Adjustment always shows the number. Roll Result is blank when there is no single check total.</p>
              </details>
              <details>
                <summary>Sheet columns &amp; templates</summary>
                <p>Edit columns to show, hide, rename, reorder, add blank cells, or negate numeric values. Optional columns start hidden.</p>
                <p>Save a character first to keep up to ten templates. New starts from the current layout; enter a name and use Save. Switching templates warns about unsaved edits. Default cannot be deleted.</p>
                <p>Export layout and Import layout transfer one layout. Import changes the preview until Save is used. Character backups include all templates and the active selection.</p>
              </details>
            </div>
          )}
        </div>
        <form
          className="form-card"
          onSubmit={e => {
            e.preventDefault();
            handleGenerate();
          }}
          autoComplete="off"
        >
          <fieldset className="form-section">
          <legend>Character</legend>
          {/* Character Name */}
          <label>
            Character Name
            <input
              type="text"
              value={character}
              onChange={e => setCharacter(e.target.value)}
              placeholder="Bob the Barbarian"
            />
          </label>

          <CharacterSaves name={character} skills={skills} selectedSkill={selectedSkill} sheetSettings={sheetSettings} onSave={profile => {
            setSheetOwner(profileKey(profile.name)); setSheetSettings(loadSheetSettings(profile));
          }} onLoad={profile => {
            if (sheetSettingsDirty(sheetSettings) && !window.confirm("Discard unsaved sheet layout changes and load this character?")) return false;
            setSheetOwner(profileKey(profile.name)); setSheetSettings(loadSheetSettings(profile));
            setCharacter(profile.name);
            setSkills(profile.skills.map(saved => ({ ...saved, modifier: String(saved.modifier) })));
            setSelectedSkill(profile.selectedSkill);
            setOutput(""); setError(""); setCopied(false);
          }} />
          <CharacterSkills skills={skills} selected={selectedSkill} onChange={(next, selected) => {
            setSkills(next); setSelectedSkill(selected);
            setOutput(""); setError(""); setCopied(false);
          }} />
          </fieldset>

          <fieldset className="form-section">
          <legend>Downtime</legend>
          <div className="result-mode-row">
            <PopoverHelp label="Help with downtime dates">
              Enter any two values to calculate the third. Start and end dates both count:
              September 1 through September 7 is 7 days.
              <br /><br />
              When all three are filled, the two fields you edited most recently determine the third.
              All three fields start blank, so you can begin with any pair.
              Use Clear Dates to empty all three fields and start over with any pair.
              <br /><br /><em>Tap or click outside to close.</em>
            </PopoverHelp>
            <button type="button" className="clear-dates-button" onClick={clearPeriod}>
              Clear Dates
            </button>
          </div>
          <div className="form-row period-row">
            <label>
              Start Date
              <input
                type="date"
                required
                min="0001-01-01"
                max="9999-12-31"
                value={startDate}
                onChange={e => changePeriod("startDate", e.target.value)}
              />
            </label>
            <label>
              Days
              <input
                type="number"
                min={1}
                required
                value={days}
                onChange={e => changePeriod("days", e.target.value)}
                placeholder="7"
              />
            </label>
            <label>
              End Date
              <input
                type="date"
                required
                min="0001-01-01"
                max="9999-12-31"
                value={endDate}
                onChange={e => changePeriod("endDate", e.target.value)}
              />
            </label>
          </div>

          {period.error && <div role="alert">{period.error}</div>}

          {/* Description */}
          <label>
            Description
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Tell big heaping Barbarian Stories I did"
            />
          </label>

          {/* Task DC controls */}
          <div className="task-dc-row">
            <label>
              Task Level
              <input
                type="number"
                min={0}
                max={20}
                value={taskLevel}
                onChange={e => {
                  setOutput(""); setError(""); setCopied(false);
                  const value = e.target.value;
                  if (value === "") setTaskLevel("");
                  else {
                    const num = Number(value);
                    if (isNaN(num)) setTaskLevel("");
                    else setTaskLevel(Math.max(0, Math.min(num, 20)).toString());
                  }
                }}
                placeholder="0"
              />
            </label>
          <label>Difficulty<select value={difficulty} onChange={e => { setDifficulty(Number(e.target.value)); setOutput(""); setError(""); setCopied(false); }}>
                <option value={-10}>Incredibly easy (-10)</option>
                <option value={-5}>Very easy (-5)</option>
                <option value={-2}>Easy (-2)</option>
                <option value={0}></option>
                <option value={2}>Hard (+2)</option>
                <option value={5}>Very hard (+5)</option>
                <option value={10}>Incredibly hard (+10)</option>
              </select></label>
              <label>Manual DC Adj.<input type="number" step={1} placeholder="0" value={manualDCAdjustment} onChange={e => { setManualDCAdjustment(e.target.value); setOutput(""); setError(""); setCopied(false); }} /></label>
            </div>

          </fieldset>

          <fieldset className="form-section">
          <legend>Results &amp; Rolls</legend>
          <div className="entry-mode" role="group" aria-label="Result entry mode">
            <button type="button" aria-pressed={entryMode === "checks"} onClick={() => { setEntryMode("checks"); setOutput(""); setError(""); }}>Check List</button>
            <button type="button" aria-pressed={entryMode === "manual"} onClick={() => { setEntryMode("manual"); setOutput(""); setError(""); }}>Manual Counts</button>
          </div>
          {entryMode === "checks" ? <CheckList
            checks={checks} dcAdjustment={dcAdjustment} defaultModifier={activeSkill.modifier} days={Number(days)} level={Number(taskLevel)} proficiency={proficiency}
            experienced={hasExperiencedProfessional}
            onChange={value => { setChecks(value); setOutput(""); setError(""); setCopied(false); }}
          /> : <>
          {/* Critical Successes and Successes, same line */}
          <div className="result-mode-row">
          <label>
            <input
              type="checkbox"
              checked={applyOneResultToAllDays}
              onChange={e => {
                setApplyOneResultToAllDays(e.target.checked);
                setOutput("");
                setError("");
                setCopied(false);
              }}
            />
            Apply one result to all downtime days
          </label>
          <PopoverHelp>
            <strong>Checked:</strong> Enter 1 in exactly one result field; leave the others blank or 0.
            That result applies to every downtime day. For example, 1 success pays the success amount for all 7 days.
            <br /><br />
            <strong>Unchecked:</strong> Enter a result for each downtime day. The counts must add up to your downtime days.
            <br /><br /><em>Tap or click outside to close.</em>
          </PopoverHelp>
          </div>
          <div className="form-row">
            <label>
              Critical Successes
              <input
                type="number"
                min={0}
                value={criticalSuccess}
                onChange={e => setCriticalSuccess(e.target.value)}
                placeholder="0"
              />
            </label>
            <label>
              Successes
              <input
                type="number"
                min={0}
                value={success}
                onChange={e => setSuccess(e.target.value)}
                placeholder="0"
              />
            </label>
          </div>

          {/* Failures and Critical Failures, same line */}
          <div className="form-row">
            <label>
              Failures
              <input
                type="number"
                min={0}
                value={failure}
                onChange={e => setFailure(e.target.value)}
                placeholder="0"
              />
            </label>
            <label>
              Critical Failures
              <input
                type="number"
                min={0}
                value={criticalFailure}
                onChange={e => setCriticalFailure(e.target.value)}
                placeholder="0"
              />
            </label>
          </div>

          </>}

          {/* Discord Rolls Link */}
          <label>
            Discord Rolls Link
            <input
              type="text"
              value={rollsLink}
              onChange={e => setRollsLink(e.target.value)}
              autoComplete="off"
            />
          </label>

          </fieldset>

          <button type="submit">Generate Summary</button>
        </form>

        {/* Error message display */}
        {error && (
          <div className="error-message" role="alert" style={{ color: "red", marginTop: "1em" }}>
            {error}
          </div>
        )}

        {copied && (
          <div className="copied-toast">
            Summary copied to clipboard!
          </div>
        )}

        {output && (
          <SheetOutput summary={output} row={sheetRow} character={character} owner={sheetOwner} settings={sheetSettings} onChange={setSheetSettings} />
        )}

          <footer className="footer">
          <a
            href="https://github.com/tuhs1985/pf2e-earn-income"
            target="_blank"
            rel="noopener noreferrer"
          >
            View on GitHub / Report Issues
          </a>
		  
          <p className="paizo-notice">
            This website uses trademarks and/or copyrights owned by Paizo Inc., used under Paizo's Community Use Policy (paizo.com/licenses/communityuse). 
            We are expressly prohibited from charging you to use or access this content. This website is not published, endorsed, or specifically approved by Paizo. 
            For more information about Paizo Inc. and Paizo products, visit{' '}
            <a 
              href="https://paizo.com/" 
              target="_blank"
              rel="noopener noreferrer"
            >
              paizo.com
            </a>.
          </p>
          </footer>
      </div>
    </div>
  );
}
