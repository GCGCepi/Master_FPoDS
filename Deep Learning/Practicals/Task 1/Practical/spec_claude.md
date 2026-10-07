# Project specification

## 1. Objective

Build a single-page web application, running entirely in the browser, that **visualizes the training curves of a neural network** — loss and accuracy per epoch, for the training and validation sets — and **helps spot common anomalies**: overfitting, underfitting, divergence and plateau.

The input is a training log, the standard output of any training loop. The page turns those raw numbers into a diagnosis such as *"val_loss started rising at epoch 20 while train_loss kept dropping"*, the visual signature of overfitting.

The application is an educational tool: every number it shows must be traceable to the data, and every action must give clear feedback.

## 2. Scope

### In scope

- Loading a training log CSV selected by the user, or a built-in sample log.
- Validating, displaying and summarizing the log.
- Plotting training curves (loss and accuracy per epoch).
- Detecting and explaining overfitting, underfitting, divergence and plateau.

### Out of scope

- Training neural networks (the log comes from an external training loop).
- Any backend server, database, user accounts or remote storage.
- Uploading data to any external service.

## 3. Input data

### 3.1 Training log CSV

| Column       | Type    | Rules                                  |
| ------------ | ------- | -------------------------------------- |
| `epoch`      | integer | ≥ 1, strictly increasing, no gaps      |
| `train_loss` | decimal | ≥ 0                                    |
| `val_loss`   | decimal | ≥ 0                                    |
| `train_acc`  | decimal | between 0 and 1 (inclusive) — optional |
| `val_acc`    | decimal | between 0 and 1 (inclusive) — optional |

- The two accuracy columns are optional, but they must appear together. A log without them (for example, one from a regression model) is valid. In that case the accuracy chart and the accuracy statistics and checks are hidden.
- At least 2 epochs. Anomaly checks that need more epochs than the log has are skipped, with a note saying so.
- The sample file is `training_log.csv` (60 epochs, all five columns).

Example of valid content:

```csv
epoch,train_loss,val_loss,train_acc,val_acc
1,2.125,2.2284,0.2038,0.2836
2,1.887,1.9806,0.2948,0.3669
3,1.6984,1.8238,0.3846,0.4332
```

### 3.2 General CSV rules

- Encoding: UTF-8 (a BOM at the start must be tolerated).
- Delimiter: comma. Decimal separator: dot (`.`).
- Line endings: `\n` or `\r\n`.
- Leading/trailing whitespace in cells is trimmed.
- Empty trailing lines are ignored.
- Column order does not matter; column names are matched case-insensitively.
- Extra columns are allowed and are ignored (with a notice to the user).
- Maximum file size: **10 MB**. Maximum rows: **100 000**.

## 4. Main features

### 4.1 File loading

1. The user selects a file using a file picker **or** by dragging and dropping it onto the page.
2. A **Load sample** button loads `training_log.csv`, so the app can be tried without any data.
3. Only `.csv` files are accepted.
4. The file name, size and number of rows are shown after loading.
5. Loading a new valid file replaces the current log.

### 4.2 Validation and error messages

The system validates the file before using it. When a file is invalid, the system must:

- Show **what** is wrong, **where** (row and column), and **how** to fix it. Row numbers count the header as row 1.
  - Example: *"Row 14, column `val_acc`: value `1.3` is out of range. Accuracy must be between 0 and 1."*
- Show at most the first 10 errors, plus the total count.
- Never show raw technical errors (stack traces) to the user.
- Keep the previous valid state (a failed load must not clear the current data).

Errors that must be detected: empty file, missing header, missing required columns, only one of the two accuracy columns, duplicated column names, rows with a different number of cells than the header, missing values, non-numeric values, out-of-range values, epochs not strictly increasing or with gaps, fewer than 2 epochs, too many rows, file too large, wrong file type.

### 4.3 Data table

- The data is displayed in an HTML table.
- If there are more than 50 rows, the table is paginated (50 rows per page).
- Columns can be sorted by clicking their header.
- Numbers are displayed with a consistent number of decimals (4 by default).

### 4.4 Summary statistics

For every numeric column the system shows: count, minimum, maximum, mean, median and standard deviation.

- The standard deviation is the **sample** standard deviation (divides by *n − 1*). This must be stated in the interface.
- The system also shows:
  - Best epoch (lowest `val_loss`; the first one if tied) and its `val_acc` (if present).
  - Final train/validation gap for loss (`val_loss − train_loss` at the last epoch), and for accuracy if present (`train_acc − val_acc`).

### 4.5 Training curves

1. A line chart of `train_loss` and `val_loss` versus `epoch`.
2. A line chart of `train_acc` and `val_acc` versus `epoch`, shown only when accuracy is available.
3. The best epoch is marked on both charts.
4. Charts show tooltips with exact values on hover and have labelled axes, a title and a legend.
5. The user can toggle a logarithmic scale on the loss chart.

### 4.6 Diagnosis

The system checks the log for four anomalies. For each one found it shows its name, the epoch(s) involved, a one-sentence explanation of what the curves show, and a short hint of what to try. If none is found it says so ("No anomalies detected").

| Anomaly      | Rule                                                                                                                                                                                                     | Needs        |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| Overfitting  | `val_loss` rises for 5 consecutive epochs right after its minimum (each epoch strictly higher than the one before), while `train_loss` keeps dropping (lower after those 5 epochs than at the minimum). | 6 epochs     |
| Underfitting | The final `train_loss` is still more than 50 % of the first `train_loss`, or (if accuracy is present) the final `train_acc` is below 0.6.                                                                | 2 epochs     |
| Divergence   | `train_loss` rises for 5 consecutive epochs (each strictly higher than the one before) anywhere in the log, or the final `train_loss` is higher than the first.                                         | 2 epochs     |
| Plateau      | Over the last 10 epochs, `val_loss` changed by less than 1 % of its value 10 epochs before the end (in either direction).                                                                                | 11 epochs    |

Example explanations and hints:

- Overfitting: *"val_loss reached its minimum at epoch 20 and rose for the next 5 epochs while train_loss kept dropping."* Hint: stop at the best epoch (early stopping), add regularization or more data.
- Underfitting: *"train_loss only fell from 2.13 to 1.40 (66 % of its first value)."* Hint: train longer, use a bigger model or a higher learning rate.
- Divergence: *"train_loss rose for 5 consecutive epochs from epoch 12."* Hint: lower the learning rate.
- Plateau: *"val_loss changed by only 0.4 % over the last 10 epochs (epochs 50–60)."* Hint: stop training, or lower the learning rate.

## 5. Non-functional requirements

### 5.1 Technology

- Pure HTML, CSS and JavaScript (ES modules). No build step, no framework.
- **Chart.js** for charts, loaded from a CDN with a **pinned version** (version and URL in `architecture_claude.md`). No Subresource Integrity hash is used.
- The application must work when it is served by a simple static server (e.g. `python -m http.server`) in the latest versions of Chrome, Firefox, Edge and Safari.

### 5.2 Security and privacy

- **All data stays in the browser.** The only network requests are to load the pinned library and the app's own files (pages, scripts, styles, sample CSV) from the local server. User data is never sent anywhere.
- Content read from a file is **never** inserted into the page as HTML. It is always inserted as plain text (e.g. using `textContent`), to prevent script injection through a malicious CSV.
- No use of `eval`, `new Function` or inline event handlers (`onclick="..."`).
- No Content Security Policy is declared.
- File size and row limits (section 3.2) are enforced **before** parsing the whole file, to avoid freezing the browser.

### 5.3 Usability and accessibility

- Responsive layout: usable from 360 px (mobile) to large desktop screens.
- Light and dark theme, following the system preference.
- All controls are reachable and usable with the keyboard, have visible focus and accessible labels.
- Text and chart colors meet WCAG AA contrast; series are distinguishable without relying only on color (e.g. dashed line for validation).
- Error and status messages are announced to screen readers (live region).
- The interface language is English.

### 5.4 Performance

- Loading and displaying a 10 000-row CSV takes less than 2 seconds on a standard laptop.

### 5.5 Code quality

- Code is split into modules with a single responsibility (see `architecture_claude.md`).
- Parsing, validation, statistics and diagnosis are **pure functions**, independent from the DOM, so they can be tested.
- Every function has a short comment explaining its purpose, inputs and outputs.
- No unused code, no `console.log` left in the final version.
- Unit tests exist for CSV parsing, validation, statistics and diagnosis, and can be run in the browser (a `tests.html` page) with no extra tools.

## 6. Acceptance criteria

The project is considered complete when all of the following can be verified:

**Loading & validation**

- [ ] "Load sample" loads `training_log.csv` and shows 60 rows.
- [ ] Each error type in section 4.2 has a sample file in `data/invalid/` that produces the expected message, with row and column where applicable.
- [ ] A file larger than 10 MB is rejected without freezing the page.
- [ ] A CSV cell containing `<img src=x onerror=alert(1)>` is shown as plain text and nothing executes.

**Table & statistics**

- [ ] The table shows all rows, paginated and sortable.
- [ ] Mean, median and sample standard deviation match a reference calculation (e.g. a spreadsheet or NumPy) to 4 decimals.
- [ ] The best epoch and final gaps are correct for `training_log.csv`.

**Charts**

- [ ] Loss and accuracy charts show both train and validation curves with labelled axes, legend and best-epoch marker; the log-scale toggle works.

**Diagnosis**

- [ ] Each anomaly has an example log in `data/examples/` that is diagnosed correctly, and a healthy example log shows "No anomalies detected".
- [ ] The diagnosis of `training_log.csv` is correct.

**Quality**

- [ ] No errors or warnings in the browser console during normal use.
- [ ] No network requests other than the pinned library and the app's own files (checked in the Network tab).
- [ ] The unit tests page passes.
- [ ] The code is organized in modules and commented.

## 7. AI implementation process

The project is implemented one task at a time, in the order given in `tasks_claude.md`, following the working rules in `reglesIA_claude.md`. Those rules define the whole process: reading the documents, planning, verifying, reporting and waiting for confirmation.
