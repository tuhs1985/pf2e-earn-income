import { useState } from "react";
import { buildDiscordSummary } from "./utils/earnIncome";

import type { DiscordSummaryInput, DayResultCounts } from "./utils/earnIncome";

function getTodayDateString(): string {
  const today = new Date();
  return today.toISOString().split("T")[0]; // format as YYYY-MM-DD
}

export default function App() {
  const [data, setData] = useState<DiscordSummaryInput & { days: number; hasExperiencedProfessional: boolean }>({
    character: "",
    endDate: getTodayDateString(),
    days: 7,
    skill: "",
    description: "",
    taskLevel: 0,
    proficiency: "trained",
    counts: {
      criticalSuccess: 0,
      success: 0,
      failure: 0,
      criticalFailure: 0,
    },
    rollsLink: "",
    hasExperiencedProfessional: false,
  });

  const [output, setOutput] = useState("");
  const [copied, setCopied] = useState(false);

  const handleChange = (key: keyof typeof data, value: any) => {
    setData({ ...data, [key]: value });
  };

  const handleCountsChange = (key: keyof DayResultCounts, value: number) => {
    setData({
      ...data,
      counts: { ...data.counts, [key]: value },
    });
  };

  const generate = () => {
    const summary = buildDiscordSummary(data);
    setOutput(summary);
    navigator.clipboard.writeText(summary).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div style={{ padding: "1rem", fontFamily: "sans-serif", position: "relative" }}>
      <h1>PF2e Earn Income Generator</h1>

      <label>
        Character:
        <input type="text" value={data.character} onChange={(e) => handleChange("character", e.target.value)} />
      </label>
      <br />

      <label>
        Downtime Days:
        <input
          type="number"
          min={1}
          value={data.days || ""}
          onChange={(e) => handleChange("days", Number(e.target.value))}
        />
      </label>
      <br />

      <label>
        End Date:
        <input type="date" value={data.endDate} onChange={(e) => handleChange("endDate", e.target.value)} />
      </label>
      <br />

      <label>
        Skill Used:
        <input type="text" value={data.skill} onChange={(e) => handleChange("skill", e.target.value)} />
      </label>
      <br />

      <label>
        Description:
        <textarea value={data.description} onChange={(e) => handleChange("description", e.target.value)} />
      </label>
      <br />

      <label>
        Task Level:
        <input type="number" min={0} max={20} value={data.taskLevel} onChange={(e) => handleChange("taskLevel", Number(e.target.value))} />
      </label>
      <br />

      <label>
        Proficiency:
        <select value={data.proficiency} onChange={(e) => handleChange("proficiency", e.target.value)}>
          <option value="trained">Trained</option>
          <option value="expert">Expert</option>
          <option value="master">Master</option>
          <option value="legendary">Legendary</option>
        </select>
      </label>
      <br />

      <label>
        Critical Successes:
        <input type="number" min={0} value={data.counts.criticalSuccess} onChange={(e) => handleCountsChange("criticalSuccess", Number(e.target.value))} />
      </label>
      <br />

      <label>
        Successes:
        <input type="number" min={0} value={data.counts.success} onChange={(e) => handleCountsChange("success", Number(e.target.value))} />
      </label>
      <br />

      <label>
        Failures:
        <input type="number" min={0} value={data.counts.failure} onChange={(e) => handleCountsChange("failure", Number(e.target.value))} />
      </label>
      <br />

      <label>
        Critical Failures:
        <input type="number" min={0} value={data.counts.criticalFailure} onChange={(e) => handleCountsChange("criticalFailure", Number(e.target.value))} />
      </label>
      <br />

      <label>
        Discord Rolls Link:
        <input type="text" value={data.rollsLink} onChange={(e) => handleChange("rollsLink", e.target.value)} />
      </label>
      <br />

      <label>
        <input
          type="checkbox"
          checked={data.hasExperiencedProfessional}
          onChange={(e) => handleChange("hasExperiencedProfessional", e.target.checked)}
        />
        Experienced Professional (Lore only)
      </label>
      <br /><br />

      <button onClick={generate}>Generate Summary</button>

      {copied && (
        <div
          style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            backgroundColor: "#222",
            color: "white",
            padding: "1rem 2rem",
            borderRadius: "0.5rem",
            boxShadow: "0 0 10px rgba(0,0,0,0.3)",
            zIndex: 999,
            fontSize: "1.2rem"
          }}
        >
          Summary copied to clipboard!
        </div>
      )}

      {output && (
        <pre
          style={{
            whiteSpace: "pre-wrap",
            backgroundColor: "var(--bg)",
            color: "var(--text)",
            padding: "1rem",
            marginTop: "1rem",
            borderRadius: "0.5rem",
            fontFamily: "monospace",
            border: "1px solid #666",
          }}
        >
          {output}
        </pre>
      )}

      {/* Add footer here */}
      <footer
        style={{
          marginTop: "2rem",
          textAlign: "center",
          fontSize: "0.9rem",
          color: "#888",
        }}
      >
        <a
          href="https://github.com/tuhs1985/pf2e-earn-income"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "#888", textDecoration: "underline" }}
        >
          View on GitHub / Report Issues
        </a>
      </footer>
    </div>  );
}

