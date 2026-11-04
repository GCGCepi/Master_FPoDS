# Project specification

## 1. Objective

Build a single-page web application, running entirely in the browser, that lets a user:

1. **Load and visualize a neural network training log** (CSV) to analyze how a model learned.
2. **Define, train and evaluate a small neural network** directly in the browser on a tabular CSV dataset, watching the training progress live.

The application is an educational tool: every number it shows must be traceable to the data, and every action must give clear feedback.

## 2. Scope

### In scope

- Loading CSV files selected by the user from their computer.
- Validating, displaying and summarizing those files.
- Plotting training curves (loss and accuracy per epoch).
- Building, training and evaluating a feed-forward neural network (multilayer perceptron) in the browser.
- Exporting results (training log and trained model) back to the user's computer.

### Out of scope

- Any backend server, database, user accounts or remote storage.
- Uploading data to any external service.
- Image, text or sequence models (CNNs, RNNs, transformers).
- Training on GPUs outside of what the browser offers (WebGL / WebGPU).

## 3. Input data

### 3.1 Training log CSV (mode A)

| Column       | Type    | Rules                                  |
| ------------ | ------- | -------------------------------------- |
| `epoch`      | integer | ≥ 1, strictly increasing, no gaps      |
| `train_loss` | decimal | ≥ 0                                    |
| `val_loss`   | decimal | ≥ 0                                    |
| `train_acc`  | decimal | between 0 and 1 (inclusive) — optional |
| `val_acc`    | decimal | between 0 and 1 (inclusive) — optional |

The two accuracy columns are optional, but they must appear together. A log without them (for example, one exported from a regression model) is valid. In that case the accuracy chart and the accuracy statistics are hidden.

The reference file is `training_log.csv` (60 epochs, all five columns).

Example of valid content:

```csv
epoch,train_loss,val_loss,train_acc,val_acc
1,2.125,2.2284,0.2038,0.2836
2,1.887,1.9806,0.2948,0.3669
3,1.6984,1.8238,0.3846,0.4332
```

### 3.2 Dataset CSV (mode B)

- First row is a header with unique, non-empty column names.
- All columns except the target must be numeric (features).
- The user chooses which column is the **target** after loading.
  - If the target has few distinct values (≤ 20) it is treated as **classification**; otherwise as **regression**. The user can override this choice.
- At least 20 rows and at least 1 feature column.
- The target column may contain text (class names) or numbers. Feature columns must be numeric.
- The reference file is `iris.csv` (150 rows, 4 numeric features, target `species` with 3 classes).

### 3.3 General CSV rules (both modes)

- Encoding: UTF-8 (a BOM at the start must be tolerated).
- Delimiter: comma. Decimal separator: dot (`.`).
- Line endings: `\n` or `\r\n`.
- Leading/trailing whitespace in cells is trimmed.
- Empty trailing lines are ignored.
- Column order does not matter; column names are matched case-insensitively.
- Maximum file size: **10 MB**. Maximum rows: **100 000**.
- Extra columns are allowed in mode A and are ignored (with a notice to the user).

## 4. Main features

### 4.1 File loading

1. The user selects a file using a file picker **or** by dragging and dropping it onto the page.
2. Only `.csv` files are accepted.
3. The file name, size and number of rows are shown after loading.
4. Each mode has a **Load sample** button that loads its reference file (`training_log.csv` in mode A, `iris.csv` in mode B), so the app can be tried without any data.
5. Each mode keeps its own data: loading a file in one mode does not affect the other.

### 4.2 Validation and error messages

The system validates the file before using it. When a file is invalid, the system must:

- Show **what** is wrong, **where** (row and column), and **how** to fix it.
  - Example: *"Row 14, column `val_acc`: value `1.3` is out of range. Accuracy must be between 0 and 1."*
- Show at most the first 10 errors, plus the total count.
- Never show raw technical errors (stack traces) to the user.
- Keep the previous valid state (a failed load must not clear the current data).

Errors that must be detected: empty file, missing header, missing required columns, duplicated column names, rows with a different number of cells than the header, non-numeric values in numeric columns, missing values, out-of-range values, file too large, wrong file type.

### 4.3 Data table

- The data is displayed in an HTML table.
- If there are more than 50 rows, the table is paginated (50 rows per page).
- Columns can be sorted by clicking their header.
- Numbers are displayed with a consistent number of decimals (4 by default).

### 4.4 Summary statistics

For every numeric column the system shows: count, minimum, maximum, mean, median and standard deviation.

- The standard deviation is the **sample** standard deviation (divides by *n − 1*). This must be stated in the interface.
- In mode A the system also shows:
  - Best epoch (lowest `val_loss`) and its `val_acc` (if present).
  - Final train/validation gap for loss, and for accuracy if present.
  - An **overfitting warning** if `val_loss` increases for 5 consecutive epochs after its minimum.

### 4.5 Training curves

These charts are used in mode A (from the loaded log) and in mode B (updated live during training).

1. A line chart of `train_loss` and `val_loss` versus `epoch`.
2. A line chart of `train_acc` and `val_acc` versus `epoch`, shown only when accuracy is available (mode A with accuracy columns, or mode B classification).
3. The best epoch is marked on both charts.
4. Charts show tooltips with exact values on hover and have labelled axes, a title and a legend.
5. The user can toggle a logarithmic scale on the loss chart.

### 4.6 Neural network (mode B)

#### Configuration

The user can configure, through form controls with sensible defaults:

| Parameter              | Default                          | Allowed values                    |
| ---------------------- | -------------------------------- | --------------------------------- |
| Hidden layers          | 2                                | 1 – 5                             |
| Neurons per layer      | 16                               | 1 – 256                           |
| Activation             | ReLU                             | ReLU, tanh, sigmoid               |
| Optimizer              | Adam                             | SGD, Adam                         |
| Learning rate          | 0.001                            | 0.00001 – 1                       |
| Epochs                 | 50                               | 1 – 1000                          |
| Batch size             | 32                               | 1 – 1024                          |
| Validation split       | 20 %                             | 5 % – 50 %                        |
| Random seed            | 42                               | any integer                       |
| Early stopping patience| 10                               | 0 (off) – 100                     |

- Invalid values are rejected next to the field with an explanation; training cannot start until the form is valid.
- The network architecture (layers, neurons, number of parameters) is displayed as a summary before training.

#### Preprocessing

- Features are standardized (zero mean, unit variance) using statistics computed **only on the training split**.
- For classification, the target is one-hot encoded and the output layer uses softmax with cross-entropy loss.
- For regression, the output layer is linear and the loss is mean squared error.
- The rows are shuffled once with the random seed before the train/validation split. The seed is also used for weight initialization.
- The user can override the detected task type (classification or regression) before training.

#### Training

1. The user starts training with a button; while training, the button changes to **Stop**.
2. The training curves (section 4.5) are updated live after each epoch.
3. A progress indicator shows current epoch / total epochs and elapsed time.
4. The interface must remain responsive during training (the page must not freeze).
5. **Early stopping**: stop when `val_loss` has not improved for *patience* epochs (see the configuration table; 0 turns it off).
6. If the loss becomes `NaN` or infinite, training stops and the user is told to lower the learning rate.

#### Evaluation and prediction

- After training, show final metrics on the validation split:
  - Classification: accuracy and confusion matrix.
  - Regression: MSE, MAE and R².
- The user can enter feature values in a form and get a prediction from the trained model.

#### Export

- Download the training history as a CSV in the format of section 3.1 (so it can be reloaded in mode A). For regression, the accuracy columns are omitted.
- Download the trained model as files that can be loaded back into the app: the network (architecture + weights) and a file with the preprocessing information (feature names, standardization statistics, task type and class names). The exact files are defined in `architecture_claude.md`.

## 5. Non-functional requirements

### 5.1 Technology

- Pure HTML, CSS and JavaScript (ES modules). No build step, no framework.
- **Chart.js** for charts.
- **TensorFlow.js** for the neural network.
- External libraries are loaded from a CDN with a **pinned version** and a **Subresource Integrity (`integrity`) hash** (versions and URLs in `architecture_claude.md`).
- The application must work when it is served by a simple static server (e.g. `python -m http.server`) in the latest versions of Chrome, Firefox, Edge and Safari.

### 5.2 Security and privacy

- **All data stays in the browser.** The only network requests are to load the pinned libraries and the app's own files (pages, scripts, sample CSVs) from the local server. User data is never sent anywhere.
- Content read from a file is **never** inserted into the page as HTML. It is always inserted as plain text (e.g. using `textContent`), to prevent script injection through a malicious CSV.
- No use of `eval`, `new Function` or inline event handlers (`onclick="..."`).
- A Content Security Policy is declared that only allows scripts from the page itself and the chosen CDN.
- File size and row limits (section 3.3) are enforced **before** parsing the whole file, to avoid freezing the browser.
- When exporting a CSV, any cell starting with `=`, `+`, `-`, `@` that is not a number is prefixed with `'` to prevent formula injection when opened in spreadsheet software.
- Loaded model files are validated (structure and expected fields) before use; invalid files are rejected with a clear error.

### 5.3 Usability and accessibility

- Responsive layout: usable from 360 px (mobile) to large desktop screens.
- Light and dark theme, following the system preference.
- All controls are reachable and usable with the keyboard, have visible focus and accessible labels.
- Text and chart colors meet WCAG AA contrast; series are distinguishable without relying only on color (e.g. dashed line for validation).
- Error and status messages are announced to screen readers (live region).
- The interface language is English.

### 5.4 Performance

- Loading and displaying a 10 000-row CSV takes less than 2 seconds on a standard laptop.
- Training a network with the default configuration on a 1 000-row dataset completes in under 30 seconds.

### 5.5 Code quality

- Code is split into modules with a single responsibility (see `architecture_claude.md`).
- Parsing, validation, statistics and model logic are **pure functions**, independent from the DOM, so they can be tested.
- Every function has a short comment explaining its purpose, inputs and outputs.
- No unused code, no `console.log` left in the final version.
- Unit tests exist for CSV parsing, validation and statistics, and can be run in the browser (a `tests.html` page) with no extra tools.

## 6. Acceptance criteria

The project is considered complete when all of the following can be verified:

**Loading & validation**

- [ ] `training_log.csv` loads in mode A and shows 60 rows.
- [ ] Each error type in section 4.2 has a sample file in `data/invalid/` that produces the expected message, with row and column where applicable.
- [ ] A file larger than 10 MB is rejected without freezing the page.
- [ ] A CSV cell containing `<img src=x onerror=alert(1)>` is shown as plain text and nothing executes.

**Table & statistics**

- [ ] The table shows all rows, paginated and sortable.
- [ ] Mean, median and sample standard deviation match a reference calculation (e.g. a spreadsheet or NumPy) to 4 decimals.
- [ ] The best epoch and overfitting warning are correct for `training_log.csv`.

**Charts**

- [ ] Loss and accuracy charts show both train and validation curves with labelled axes, legend and best-epoch marker.

**Neural network**

- [ ] `iris.csv` trains with default settings, the curves update live, and validation accuracy is above 0.9.
- [ ] Training twice with the same seed and configuration gives the same split and initial weights, and final metrics within ±0.01 (small differences can come from GPU arithmetic).
- [ ] The Stop button halts training within one epoch.
- [ ] The confusion matrix (classification) or MSE/MAE/R² (regression) are shown after training.
- [ ] A prediction can be made from the form.
- [ ] The exported history CSV can be reloaded in mode A; the exported model can be reloaded and gives the same predictions.

**Quality**

- [ ] No errors or warnings in the browser console during normal use.
- [ ] No network requests other than the pinned libraries and the app's own files (checked in the Network tab).
- [ ] The unit tests page passes.
- [ ] The code is organized in modules and commented.

## 7. AI implementation process

The project is implemented one task at a time, in the order given in `tasks_claude.md`, following the working rules in `reglesIA_claude.md`. Those rules define the whole process: reading the documents, planning, verifying, reporting and waiting for confirmation.
