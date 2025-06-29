import { useState, useEffect } from "react";
import { buildDiscordSummary } from "./utils/earnIncome";
import type { DiscordSummaryInput, DayResultCounts, Proficiency } from "./utils/earnIncome";
import "./App.css";

// PWA detection (matches Crafting App logic)
function useIsStandalone() {
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const checkStandalone = () =>
      window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: fullscreen)').matches ||
      // @ts-ignore
      window.navigator.standalone === true;

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

function getTodayDateString(): string {
  const today = new Date();
  return today.toISOString().split("T")[0];
}

export default function App() {
  // Main state, broken out for clarity (parity with Crafting App)
  const [character, setCharacter] = useState("");
  const [endDate, setEndDate] = useState(getTodayDateString());
  const [days, setDays] = useState<string>("");
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

  const [output, setOutput] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [showInstructions, setShowInstructions] = useState(false);

  // PWA standalone detection
  const isStandalone = useIsStandalone();

  // Helper to package the input for the utility
  const buildInput = (): DiscordSummaryInput => ({
    character,
    endDate,
    days: days === "" ? 1 : Number(days),
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
  });

  // Generate summary
  const handleGenerate = () => {
    setError(""); // Clear previous errors
    const safeInput = buildInput();
    const totalResults =
      safeInput.counts.criticalSuccess +
      safeInput.counts.success +
      safeInput.counts.failure +
      safeInput.counts.criticalFailure;

    if (totalResults > safeInput.days) {
      setError(
        `The sum of all results (${totalResults}) cannot exceed the number of downtime days (${safeInput.days}).`
      );
      setOutput("");
      return;
    }

    try {
      const summary = buildDiscordSummary(safeInput);
      setOutput(summary);
      navigator.clipboard.writeText(summary).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    } catch (err: any) {
      setError(err.message || "An error occurred while generating the summary.");
      setOutput("");
    }
  };

  return (
    <div className="app-container">
      <div className="inner-container">
        {/* "Return to Hub" only shows if not in standalone PWA mode */}
        {!isStandalone && (
          <a
            href="https://tools.tuhsrpg.com/"
            className="return-btn"
          >
            &larr; Return to Hub
          </a>
        )}
        <h1>PF2e Earn Income Generator</h1>
        <div className="instructions-container" style={{marginBottom: "1em"}}>
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
                  <strong>Per-Day Entry:</strong> Enter the result for <b>each downtime day</b> you used. For example, if you have 7 days, you could record 3 successes, 2 failures, etc., with the total results matching the number of days.
                </li>
                <li>
                  <strong>Single-Period Entry:</strong> Enter <b>one result</b> for the entire downtime period. For example, if you only want to record the overall outcome, use a single result (e.g., 1 success for all 7 days).
                </li>
              </ol>
              <p>
                <em>
                  The total results entered should not exceed the number of downtime days.
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

          {/* Downtime Days and End Date, same line */}
          <div className="form-row">
            <label>
              Downtime Days
              <input
                type="number"
                min={1}
                value={days}
                onChange={e => setDays(e.target.value)}
                placeholder="7"
              />
            </label>
            <label>
              End Date
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
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
                  let value = e.target.value;
                  if (value === "") setTaskLevel("");
                  else {
                    let num = Number(value);
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
          <div className="error-message" style={{ color: "red", marginTop: "1em" }}>
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

        <footer>
          <a
            href="https://github.com/tuhs1985/pf2e-earn-income"
            target="_blank"
            rel="noopener noreferrer"
          >
            View on GitHub / Report Issues
          </a>
        </footer>
      </div>
    </div>
  );
}