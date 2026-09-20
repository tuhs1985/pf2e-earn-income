import { useState, useEffect } from "react";
import { buildDiscordSummary, getTodayDateString, updatePeriod } from "./utils/earnIncome";
import type { PeriodField, PeriodState } from "./utils/earnIncome";
import type { DiscordSummaryInput, Proficiency } from "./utils/earnIncome";
import "./App.css";
import PopoverHelp from "./PopoverHelp";

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
  const [character, setCharacter] = useState("");
  const [period, setPeriod] = useState<PeriodState>(() => ({
    startDate: "", days: "", endDate: getTodayDateString(), edited: ["endDate"], error: "",
  }));
  const { startDate, days, endDate } = period;
  const [skill, setSkill] = useState("");
  const [description, setDescription] = useState("");
  const [taskLevel, setTaskLevel] = useState<string>("");
  const [proficiency, setProficiency] = useState<Proficiency>("trained");
  const [criticalSuccess, setCriticalSuccess] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [failure, setFailure] = useState<string>("");
  const [criticalFailure, setCriticalFailure] = useState<string>("");
  const [rollsLink, setRollsLink] = useState("");
  const [hasExperiencedProfessional, setHasExperiencedProfessional] = useState(false);
  const [applyOneResultToAllDays, setApplyOneResultToAllDays] = useState(false);

  const [output, setOutput] = useState("");
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
    const safeInput = buildInput();
    try {
      const summary = buildDiscordSummary(safeInput);
      setOutput(summary);
      navigator.clipboard.writeText(summary).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
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
              <ol>
                <li>
                  <strong>Per-Day Entry:</strong> Leave “Apply one result to all downtime days” unchecked. Enter the result for <b>each downtime day</b>. For 7 days, you could record 3 successes and 4 failures. The counts must add up to 7.
                </li>
                <li>
                  <strong>Single-Period Entry:</strong> Check “Apply one result to all downtime days.” Enter <b>1 in exactly one result field</b> and leave the others blank or 0. For example, 1 success applies the success payout to all 7 days.
                </li>
              </ol>
              <p>
                <em>
                  Choose the entry mode before generating your summary.
                </em>
              </p>
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

          <div className="result-mode-row">
            <span>Downtime Period</span>
            <PopoverHelp label="Help with downtime dates">
              Enter any two values to calculate the third. Start and end dates both count:
              September 1 through September 7 is 7 days.
              <br /><br />
              When all three are filled, the two fields you edited most recently determine the third.
              End Date starts at today; clear it to begin with Start Date and Days instead.
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

          {/* Skill Used */}
          <label>
            Skill Used
            <input
              type="text"
              value={skill}
              onChange={e => setSkill(e.target.value)}
              placeholder="Barbarian Lore"
            />
          </label>

          {/* Description */}
          <label>
            Description
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Tell big heaping Barbarian Stories I did"
            />
          </label>

          {/* Task Level and Proficiency, same line */}
          <div className="form-row">
            <label>
              Task Level
              <input
                type="number"
                min={0}
                max={20}
                value={taskLevel}
                onChange={e => {
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
            <label>
              Proficiency
              <select
                value={proficiency}
                onChange={e => setProficiency(e.target.value as Proficiency)}
              >
                <option value="trained">Trained</option>
                <option value="expert">Expert</option>
                <option value="master">Master</option>
                <option value="legendary">Legendary</option>
              </select>
            </label>
          </div>

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
          {period.error && <div role="alert">{period.error}</div>}
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

          {/* Experienced Professional */}
          <label className="vertical-label">
            <input
              type="checkbox"
              checked={hasExperiencedProfessional}
              onChange={e => setHasExperiencedProfessional(e.target.checked)}
            />
            Experienced Professional (Lore only)
          </label>

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
          <pre className="output-pre">{output}</pre>
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
