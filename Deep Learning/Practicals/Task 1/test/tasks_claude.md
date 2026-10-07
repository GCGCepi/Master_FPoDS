# Project tasks

Rules:

- Do one task at a time, following `reglesIA_claude.md`. After each task, mark it `[x]` and wait for the student's confirmation.
- **After every task, the page must open at `http://localhost:8000` and work.** Each task adds a visible feature to an already working page. There must be no broken page, no console errors and no half-built feature hidden for a later task.
- Unfinished sections show a short placeholder (for example *"Charts — coming soon"*) instead of being empty or broken.
- Each task has a **Check** line, which describes what the student sees in the browser. The task is done only when that check passes.
- File names and responsibilities follow `architecture_claude.md`. *New files* lists the files each task creates.

## Phase 1. Visible skeleton

- [ ] **1.1** Create the page layout: a header, two mode tabs (Training log / Train a network), and in each tab a file loader and placeholder sections. Add the CSP and load Chart.js and TensorFlow.js with pinned URLs and `integrity` hashes.
  - New files: `html/index.html`, `html/styles.css`, `html/js/main.js`
  - Check: the page opens, all sections and placeholders are visible, the tabs switch, and the console has no errors.
- [ ] **1.2** Add responsive styles and a light/dark theme.
  - Check: the page looks clean on a desktop, at 360 px wide and in dark mode.

## Phase 2. Training log: load and view

- [ ] **2.1** In the Training log tab, load a CSV (file picker, drag-and-drop and "Load sample") and show it in a table using `textContent` only.
  - New files: `html/js/csv.js`, `html/js/ui.js`, `html/data/training_log.csv` (copied from `practical1/part 1/`)
  - Check: "Load sample" shows the file name, "60 rows loaded" and the table with all rows.
- [ ] **2.2** Validate the file (spec §3.1, §3.3, §4.2) and show clear error messages, with row and column where applicable.
  - New files: `html/data/invalid/*.csv` (one per error type)
  - Check: each file in `data/invalid/` shows its correct message, the previous table stays visible, and a log without the accuracy columns is accepted.
- [ ] **2.3** Add pagination (50 rows per page) and column sorting to the table.
  - Check: clicking a header sorts the table, and pagination works.

## Phase 3. Training log: analysis

- [ ] **3.1** Show summary statistics for every numeric column: count, min, max, mean, median and sample std.
  - New files: `html/js/stats.js`
  - Check: the values on the page match a spreadsheet or NumPy to 4 decimals.
- [ ] **3.2** Draw the loss and accuracy charts (train and validation) with titles, axis labels, legend and tooltips. Hide the accuracy chart when there is no accuracy.
  - New files: `html/js/charts.js`
  - Check: both charts appear for `training_log.csv`, and hovering shows the CSV values.
- [ ] **3.3** Show the best epoch, the final train/val gap and the overfitting warning. Mark the best epoch on the charts and add the log-scale toggle to the loss chart.
  - Check: the results are correct for `training_log.csv`, and the marker and toggle work.
- [ ] **3.4** Add the unit test page for parsing, validation and statistics.
  - New files: `html/tests.html`, `html/js/tests.js`
  - Check: `http://localhost:8000/tests.html` shows all tests passing.

## Phase 4. Neural network: first working training

- [ ] **4.1** In the Train a network tab, load a dataset (picker, drag-and-drop, "Load sample"), validate it (spec §3.2), show it in a table, let the user choose the target column, and show the detected task type with an option to override it.
  - New files: `html/data/iris.csv`
  - Check: "Load sample" shows the Iris table, with `species` selected as target and "classification" detected.
- [ ] **4.2** Add a **Train** button that trains a network with the **default** configuration (spec §4.6): seeded shuffle and split, standardization using training statistics only, and live training curves.
  - New files: `html/js/model.js`
  - Check: pressing Train updates the curves every epoch, the page stays responsive, and `tf.memory()` does not grow between epochs.
- [ ] **4.3** Show the evaluation after training (accuracy and confusion matrix, or MSE/MAE/R²).
  - Check: on Iris, validation accuracy is above 0.9 and the confusion matrix is shown.

## Phase 5. Neural network: control

- [ ] **5.1** Add the configuration form with all the defaults and limits from spec §4.6, plus a live model summary (layers and number of parameters). Add the pure `model.js` helpers to the test page.
  - Check: changing the values updates the summary, invalid values are rejected next to the field, training uses the new settings, and the tests still pass.
- [ ] **5.2** Add the progress indicator, the Stop button, early stopping and `NaN` detection.
  - Check: Stop halts training within one epoch, early stopping ends training early on Iris, and a training whose loss becomes `NaN` stops with the spec message (try a learning rate of 1).
- [ ] **5.3** Add the prediction form.
  - Check: entering the values of a known Iris row predicts its correct class.

## Phase 6. Export and finish

- [ ] **6.1** Add buttons to download the training history as CSV and to save and load the trained model (formats in `architecture_claude.md` §5).
  - Check: the exported CSV loads in the Training log tab, and the reloaded model gives the same predictions.
- [ ] **6.2** Final review: comments, no `console.log`, no unused code, keyboard navigation, and no network requests except the libraries and the app's own files.
  - Check: every acceptance criterion in spec §6 is ticked.
- [ ] **6.3** Tell the student that development is complete and summarize what was built.
