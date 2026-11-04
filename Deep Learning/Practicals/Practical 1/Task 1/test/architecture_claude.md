# Project architecture

## 1. File structure

```
test/                        # Project root
├── spec_claude.md           # What the system must do
├── architecture_claude.md   # How it is organized (this file)
├── tasks_claude.md          # What to do, in order
├── reglesIA_claude.md       # How the AI assistant works
└── html/                    # The application (served by the static server)
    ├── index.html           # Main page
    ├── tests.html           # Unit test page
    ├── styles.css           # All styles
    ├── js/
    │   ├── main.js          # Entry point: app state, events, tab switching
    │   ├── csv.js           # CSV parsing and validation (pure)
    │   ├── stats.js         # Statistics and training-log analysis (pure)
    │   ├── ui.js            # DOM rendering: messages, table, summary, forms
    │   ├── charts.js        # Chart.js charts
    │   ├── model.js         # Neural network with TensorFlow.js
    │   └── tests.js         # Unit tests run by tests.html
    └── data/
        ├── training_log.csv # Mode A sample (60 epochs)
        ├── iris.csv         # Mode B sample (150 rows, 3 classes)
        └── invalid/         # One small invalid CSV per error type in spec §4.2
```

Files are created in the task that first needs them (`tasks_claude.md` lists which). Until then they do not exist. The page must still work, with placeholders for unfinished sections.

## 2. Responsibility of each file

### `index.html`

The page structure only. It contains no inline scripts and no inline styles. It has:

- a `<meta>` Content Security Policy (section 4),
- a header, plus the two mode tabs: **Training log** (mode A) and **Train a network** (mode B),
- for each mode: a file loader (picker + drop zone + "Load sample"), a message area (`aria-live`), a table section, a summary section and a charts section,
- in mode B also: the target selector, configuration form, training controls, evaluation, prediction form and export/import buttons,
- the two library `<script>` tags, then `<script type="module" src="js/main.js">`.

### `styles.css`

Layout, typography, colors, and the light/dark theme (`prefers-color-scheme`). Colors are defined once as CSS variables. Responsive down to 360 px.

### `js/main.js`

The only module that connects everything. It:

- holds the application state in one object (for example `state.logData`, `state.dataset`, `state.model`, `state.training`),
- registers all event listeners with `addEventListener`,
- calls the pure modules for logic, and `ui.js` / `charts.js` to display the results.

### `js/csv.js` — pure, no DOM

- `parseCsv(text)` → `{ headers, rows }`
- `validateTrainingLog(parsed)` → `{ ok, data, errors, notices }`
- `validateDataset(parsed)` → `{ ok, data, errors }`
- `toCsv(headers, rows)` → string (with formula-injection protection, spec §5.2)

### `js/stats.js` — pure, no DOM

- `describe(values)` → `{ count, min, max, mean, median, std }` (sample std, n − 1)
- `analyzeLog(data)` → `{ bestEpoch, gaps, overfitting }`

### `js/ui.js` — DOM only, no logic

Rendering helpers: messages, table (pagination + sorting), summary, form fields. It always uses `textContent` or `document.createElement` for data, and never `innerHTML` with data.

### `js/charts.js`

- `createCurveCharts(container, options)` → handles for the loss and accuracy charts
- `updateCurves(handles, history)`, `markBestEpoch(handles, epoch)`, `setLogScale(handles, on)`
- `drawConfusionMatrix(container, matrix, labels)`

The best-epoch marker is drawn as an extra single-point dataset, so no Chart.js plugin is needed.

### `js/model.js`

- Pure helpers: `seededRandom(seed)`, `shuffleSplit(rows, valFraction, seed)`, `fitStandardizer(trainX)`, `applyStandardizer(x, stats)`
- TensorFlow.js: `buildModel(config, inputSize, outputSize)`, `train(model, data, config, callbacks)`, `evaluate(...)`, `predict(...)`, `saveModel(...)`, `loadModel(files)`

### `tests.html` + `js/tests.js`

A minimal test runner written in a few lines (no library). Each test shows pass/fail on the page. It covers `csv.js`, `stats.js` and the pure helpers in `model.js`.

## 3. Libraries

Only these two libraries are used. Both are loaded as classic scripts and expose the globals `Chart` and `tf`.

| Library       | Version | URL                                                                  |
| ------------- | ------- | -------------------------------------------------------------------- |
| Chart.js      | 4.4.1   | `https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.js`      |
| TensorFlow.js | 4.22.0  | `https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js` |

Each `<script>` tag has `integrity="sha384-..."` and `crossorigin="anonymous"`. The hash is computed from the exact file in task 1.1.

## 4. Security

The Content Security Policy in `index.html` and `tests.html` is:

```
default-src 'self'; script-src 'self' https://cdn.jsdelivr.net; style-src 'self'; img-src 'self' data: blob:; connect-src 'self'; object-src 'none'; base-uri 'none'
```

If a library needs something this policy blocks, report it to the student and do not loosen the policy silently. The other security rules are in spec §5.2 and `reglesIA_claude.md` §5.

## 5. Key design decisions

- **Two independent modes.** Each mode keeps its own state, so loading a file in one tab never clears the other.
- **Pure logic, thin DOM layer.** Parsing, validation, statistics and preprocessing don't touch the page, so `tests.html` can test them.
- **Reproducibility.** `model.js` uses its own seeded random generator to shuffle the rows once before the split. Weights use initializers with the same seed. `model.fit` is called with `shuffle: false` and with an explicit `validationData` (not `validationSplit`).
- **Responsiveness.** Training uses `model.fit` with an `onEpochEnd` callback that updates the charts and calls `await tf.nextFrame()`. Stop sets `model.stopTraining = true`.
- **Memory.** Tensors are created inside `tf.tidy()` or disposed explicitly. Training tensors are disposed when training ends.
- **Saved model format.** Two downloads: (1) `model.json` + `model.weights.bin` from `model.save('downloads://model')`, and (2) `preprocessing.json` with `{ featureNames, mean, std, taskType, classNames, config }`. To load, the user selects all three files. They are validated before use.
- **Shared training curves.** The same `charts.js` functions draw the curves in both modes. In mode B, the training history uses the mode A column names (`epoch`, `train_loss`, `val_loss`, `train_acc`, `val_acc`), so it can be exported with `toCsv` and reloaded in mode A without conversion.

## 6. How to run

From the `html/` folder:

```
python -m http.server 8000
```

Then open `http://localhost:8000` for the app, and `http://localhost:8000/tests.html` for the tests. Opening `index.html` directly from disk (`file://`) is not supported, because ES modules and the sample files need a server.
