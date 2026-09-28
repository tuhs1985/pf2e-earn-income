# PF2e Earn Income Generator — v2.0

A mobile-friendly Pathfinder Second Edition downtime calculator that turns work dates and check results into a Discord-ready earnings summary.

[Open the website](https://earnincome.tuhsrpg.com/) · [Report an issue](https://github.com/tuhs1985/pf2e-earn-income/issues)

## What's new in v2.0

- Linked **Start Date, Days, and End Date**: enter any two to calculate the third.
- **Check List** with d20 + modifier, known roll total, and Assurance methods.
- Multiple checks, each covering a chosen number of downtime days.
- Automatic degrees of success, including natural 1 and natural 20 adjustments.
- Live per-check results, daily earnings, and earnings for assigned days.
- **Manual Counts** retained for directly entering outcomes.
- Logical form sections, information popovers, and responsive phone layouts.

## Using the calculator

### 1. Character, skills, and saves

Under Character, choose **Skill Used** for the current job. Edit its name, modifier, proficiency, and Experienced Professional setting. **Add Skill** and **Remove Skill** manage the character's skill list. One selected skill applies to all checks in a summary.

**Save, Load, Delete, Export, Import** appear directly below the character name:

- Save stores the character name, skill list, and selected skill in this browser. New names create new profiles; matching names (ignoring case and surrounding spaces) require confirmation before replacement.
- Load restores character settings while keeping the current downtime and work entries.
- Delete asks for confirmation and removes the stored profile, keeping the current form values.
- Export downloads all saved Earn Income profiles as JSON.
- Import validates the entire backup before saving anything and asks before replacing matching names. Extra fields are discarded. Crafting backups have a different schema and cannot be imported directly.

Edits are not saved automatically: click Save after changing a skill. Backups are limited to 1 MB, 1,000 profiles, and 50 uniquely named skills per character.

Saves use browser localStorage, so they are specific to this site, browser, and device. Export a backup before clearing browser data or moving devices. Local preview saves and live-site saves are separate.

### Downtime period

Enter the character name, then fill any two downtime fields:

| Inputs | Calculated field |
| --- | --- |
| Start Date + End Date | Days |
| Start Date + Days | End Date |
| Days + End Date | Start Date |

Both dates count: September 1 through September 7 is **7 days**. All three fields start blank. Once all are filled, the two fields you edited most recently determine the third.

Dates use calendar-day arithmetic, including across daylight-saving changes. **Clear Dates** empties the period and resets its edit history without clearing other form fields.

### 2. Work and proficiency

Select the skill and proficiency under Character, then enter a description of the work and the task level (0–20) under Work. A blank task level is treated as level 0.

Select **Experienced Professional (Lore only)** when applicable. The calculator upgrades critical failures to failure payouts and doubles original failure payouts for expert or higher proficiency. Upgraded critical failures do not receive the doubled payout. The checkbox relies on you to confirm that the feat applies to the skill.

### 3. Results and rolls

Choose **Check List** or **Manual Counts**. Only the selected mode contributes to the summary.

#### Check List

Each row represents one check and the days it covers.

| Method | What to enter |
| --- | --- |
| d20 + modifier | Actual d20 face (1–20); uses the selected character skill modifier unless overridden |
| Known roll total | Final total and die status: Normal (2–19), Natural 1, or Natural 20 |
| Assurance | Assurance total: 10 + proficiency bonus, excluding other modifiers |

The task level supplies the DC. Meeting the DC succeeds; reaching DC + 10 critically succeeds; reaching DC − 10 or lower critically fails. Natural 20 improves the result by one degree and natural 1 worsens it by one degree. Neither is an automatic critical outcome. Assurance has no natural-die adjustment.

Rolled checks inherit the selected character's skill modifier. **Modifier override** applies a temporary full modifier to that check; clear it to inherit again. Overrides remain when switching characters or skills, so review them before generating. Known roll totals and Assurance values are entered independently.

The first row follows the whole downtime period until you edit its **Days covered** or add another check. **Add Check** preserves existing day allocations and creates a new row with blank days. Adjust the rows until the counter matches the downtime period. **Remove** deletes a row without reallocating its days.

Completed checks show their total against the DC, degree of success, daily payout, and payout for their assigned days. Experienced Professional affects those payouts when selected.

For example, at task level 1 and trained proficiency:

- Three days of critical success pay 9 sp.
- Four days of success pay 8 sp.
- Together, the seven-day period pays 1 gp, 7 sp.

The current preview is per entered check. It does not provide a pre-roll table of all possible outcomes or a probability-weighted expected value.

#### Manual Counts

Enter counts of critical successes, successes, failures, and critical failures.

- Normally, counts represent days and must add up to the downtime period.
- With **Apply one result to all downtime days** checked, enter 1 in exactly one outcome field. Leave the others blank or zero. That outcome supplies the payout for every day.

### 4. Generate the summary

Optionally include a Discord rolls link, then select **Generate Summary**. The app displays a Markdown summary and attempts to copy it to the clipboard.

The summary includes the character, date range, skill, work description, task level, proficiency, DC, outcomes, rolls link, and total earnings. In Check List mode, outcome counts represent **days covered**, not the number of individual checks.

Clipboard access depends on browser permissions and a secure context such as HTTPS or localhost. Only explicitly saved character profiles persist. Downtime dates, work descriptions, rolls, results, links, and temporary modifier overrides are not saved across a reload.

## Scope

All check rows use the same task level, proficiency, skill, and feat setting. Use separate summaries for different jobs or proficiency settings. The tool calculates payouts; the GM determines job availability, permitted duration, and any custom DC or other special rules. There is currently no custom DC override.

The site runs entirely in the browser. It includes a PWA manifest and service worker for installation and cached offline use after an initial load in a supported browser.

## Local development

Use Node.js 22 or newer with npm.

    npm ci
    npm run dev

Open the local address printed by Vite.

### Checks

    npm run lint
    npm test
    npx tsc -p tsconfig.app.json --noEmit --incremental false
    npx tsc -p tsconfig.node.json --noEmit --incremental false

Tests cover payout modes, day allocations, natural-die adjustments, Assurance, invalid input, and date calculations across time zones, daylight-saving transitions, leap days, and year boundaries.

### Build and preview

    npm run build
    npm run preview

The production build is written to the dist directory. Preview serves that build; rebuild after source changes. The build script does not run lint, tests, or TypeScript checks automatically.

## Deployment

The website uses GitHub Pages with the custom domain in public/CNAME.

After running the checks and committing the intended source changes:

    git push origin main
    npm run deploy

The deploy command automatically runs the production build through predeploy, then publishes dist to the gh-pages branch using the configured Git remote. GitHub Pages may take a short time to serve the new build. Publishing the site and pushing source are separate operations.

Keep public/CNAME, the PWA icons, and the manifest configuration when changing deployment assets. The dist directory is generated output and is ignored by Git. The repository is also an active distribution workspace, so generated files and installed dependencies can be present locally.

## Spreadsheet output

After generating a result, select **Sheet row**. Copy one tab-separated data row, or include headers. The mobile preview lists each column beside its value.

Default columns are Activity, Date, Character, Description, Status, Task Level, DC Mod, DC, Assured?, and Roll Result. Date uses the downtime end date; DC comes from task level plus the selected PF2e difficulty and additive Manual DC Adj. These adjustments apply to rolled checks and Assurance; payout rates still use task level. DC Mod shows the difficulty name, or the combined numeric adjustment when Manual DC Adj. is entered. Optional DC Adjustment always gives the combined number. Other optional columns include total Income (numeric gp), the Discord roll link, Skill, Proficiency, Days, and Start date. Roll Result is populated for a single check; multiple checks and manual counts have no single roll total.

**Edit columns** to show/hide, rename, reorder, add blank cells, or negate numeric values. Save a character to store up to ten named templates, including Default. **New** begins with the current arrangement; the same **Save** button saves the new name. Character backups include templates and the active selection. Older saves remain compatible. Layout export/import transfers one layout; imported edits stay in the working preview until saved. Text is protected from spreadsheet formula interpretation.

## Project map

| Location | Purpose |
| --- | --- |
| src/App.tsx | Main form, date state, entry-mode selection, and summary generation |
| src/CheckList.tsx | Check rows, day allocations, and live result previews |
| src/utils/earnIncome.ts | Income table, check resolution, earnings, dates, and summary formatting |
| src/PopoverHelp.tsx | Information popovers |
| src/App.css, src/PopoverHelp.css | Form layout and component styling |
| tests/earnIncome.test.mjs | Calculation and date regression tests |
| public/ | Custom domain and static PWA assets |
| vite.config.ts | Vite build and PWA configuration |

## License

MIT License. See [LICENSE](LICENSE) for the software license.

## Legal / Attribution

This project uses trademarks and/or copyrights owned by Paizo Inc., used under Paizo's Community Use Policy (paizo.com/licenses/communityuse). We are expressly prohibited from charging you to use or access this content. This project is not published, endorsed, or specifically approved by Paizo. For more information about Paizo Inc. and Paizo products, visit paizo.com.
