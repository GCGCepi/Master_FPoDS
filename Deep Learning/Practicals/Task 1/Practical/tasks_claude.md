# Project tasks

Rules:

- Do one task at a time, following `reglesIA_claude.md`. After each task, mark it `[x]` and wait for the student's confirmation.
- **After every task, the page must open at `http://localhost:8000` and work.** Each task adds a visible feature to an already working page. There must be no broken page, no console errors and no half-built feature hidden for a later task.
- Unfinished sections show a short placeholder (for example *"Charts — coming soon"*) instead of being empty or broken.
- Each task has a **Check** line, which describes what the student sees in the browser. The task is done only when that check passes.
- File names and responsibilities follow `architecture_claude.md`. *New files* lists the files each task creates.

> **Change of direction (7 Oct 2026).** The app was first built as a network-training page with a generic dataset loader. The student changed the goal to the assignment's training-log visualizer (spec §1). Tasks already done that still apply keep their `[x]`. The generic dataset validation (old 2.2) and the target/task selector (old 3.2) are replaced by task 2.4.

## Phase 1. Visible skeleton

- [x] **1.1** Create the page layout: a header, a file loader and placeholder sections.
  - New files: `html/index.html`, `html/styles.css`, `html/js/main.js`
  - Check: the page opens, all sections and placeholders are visible, and the console has no errors.
- [x] **1.2** Add responsive styles and a light/dark theme.
  - Check: the page looks clean on a desktop, at 360 px wide and in dark mode.

## Phase 2. Load and view

- [x] **2.1** Load a CSV (file picker and drag-and-drop) and show it in a table using `textContent` only. Show the file name, size and number of rows.
  - New files: `html/js/csv.js`, `html/js/ui.js`
  - Check: loading a CSV shows the file name, size, "N rows loaded" and the table with all rows.
- [x] **2.2** *(Replaced by 2.4.)* Validate the file as a generic dataset and show clear error messages.
- [x] **2.3** Add pagination (50 rows per page) and column sorting to the table.
  - Check: clicking a header sorts the table, and pagination works.
- [x] **2.4** Switch the page to training logs: replace the dataset validation with `validateTrainingLog` (spec §3.1, §3.2, §4.2), regenerate `data/invalid/` for the log format, remove the "Target and task" section, the network-training placeholders and their code, and add the Charts and Diagnosis placeholders. Update the page subtitle.
  - Check: a valid log loads; each file in `data/invalid/` shows its correct message and the previous table stays visible; a log without accuracy columns is accepted; extra columns give a notice.
- [ ] **2.5** Add the "Load sample" button.
  - New files: `html/data/training_log.csv` (copied from `practical1/part 1/`)
  - Check: "Load sample" shows `training_log.csv`, "60 rows loaded" and the table.

## Phase 3. Analysis

- [x] **3.1** Show summary statistics for every numeric column: count, min, max, mean, median and sample std.
  - New files: `html/js/stats.js`
  - Check: the values on the page match a spreadsheet or NumPy to 4 decimals.
- [ ] **3.2** Show the best epoch (and its `val_acc`) and the final train/val gaps for loss and accuracy.
  - Check: the values are correct for `training_log.csv`, and accuracy values are hidden for a log without accuracy.
- [ ] **3.3** Draw the loss and accuracy charts (train and validation) with titles, axis labels, legend, tooltips and the best-epoch marker. Hide the accuracy chart when there is no accuracy. Add the log-scale toggle to the loss chart. Load Chart.js from its pinned URL.
  - New files: `html/js/charts.js`
  - Check: both charts appear for `training_log.csv`, hovering shows the CSV values, the marker is at the best epoch, and the toggle works.
- [ ] **3.4** Add the diagnosis: the four anomaly rules of spec §4.6, each with explanation and hint, and "No anomalies detected" when none is found.
  - New files: `html/data/examples/*.csv` (one per anomaly, plus a healthy log)
  - Check: each example log gives its expected diagnosis, and `training_log.csv` is diagnosed correctly.
- [ ] **3.5** Add the unit test page for parsing, validation, statistics and diagnosis.
  - New files: `html/tests.html`, `html/js/tests.js`
  - Check: `http://localhost:8000/tests.html` shows all tests passing.

## Phase 4. Finish

- [ ] **4.1** Final review: comments, no `console.log`, no unused code, keyboard navigation, and no network requests except the library and the app's own files.
  - Check: every acceptance criterion in spec §6 is ticked.
- [ ] **4.2** Tell the student that development is complete and summarize what was built.
