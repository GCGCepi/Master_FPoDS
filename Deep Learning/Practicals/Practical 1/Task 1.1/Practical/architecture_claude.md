# Project architecture

## 1. File structure

```
Practical/                   # Project root
├── spec_claude.md           # What the system must do
├── architecture_claude.md   # How it is organized (this file)
├── tasks_claude.md          # What to do, in order
├── reglesIA_claude.md       # How the AI assistant works
└── html/                    # The application (served by the static server)
    ├── index.html           # Main page
    ├── tests.html           # Unit test page
    ├── styles.css           # All styles
    ├── js/
    │   ├── main.js          # Entry point: app state and events
    │   ├── csv.js           # CSV parsing and validation (pure)
    │   ├── stats.js         # Statistics, log analysis and diagnosis (pure)
    │   ├── ui.js            # DOM rendering: messages, table, summary, diagnosis
    │   ├── charts.js        # Chart.js charts
    │   └── tests.js         # Unit tests run by tests.html
    └── data/
        ├── training_log.csv # Sample log (60 epochs), loaded by "Load sample"
        ├── invalid/         # One small invalid CSV per error type in spec §4.2
        └── examples/        # One example log per anomaly, plus a healthy one
```

Files are created in the task that first needs them (`tasks_claude.md` lists which). Until then they do not exist. The page must still work, with placeholders for unfinished sections.

## 2. Responsibility of each file

### `index.html`

The page structure only. It contains no inline scripts and no inline styles. It has:

- a header (one single page, no tabs) with the light/dark theme button,
- a file loader (picker + drop zone + "Load sample"), a message area (`aria-live`),
- a table section, a summary section, a charts section and a diagnosis section,
- the Chart.js `<script>` tag (added in the charts task), then `<script type="module" src="js/main.js">`.

### `styles.css`

Layout, typography, colors, and the light/dark theme. Colors are defined as CSS variables; the dark values apply under `prefers-color-scheme: dark` unless `<html data-theme="light">`, or when `<html data-theme="dark">` (set by the theme button). Responsive down to 360 px.

### `js/main.js`

The only module that connects everything. It:

- holds the application state in one object (`state.log`),
- registers all event listeners with `addEventListener`,
- handles the theme button: sets `data-theme` on `<html>` and remembers the choice in `localStorage`,
- calls the pure modules for logic, and `ui.js` / `charts.js` to display the results.

### `js/csv.js` — pure, no DOM

- `parseCsv(text)` → `{ headers, rows }`
- `checkFile(name, size)`, `checkRowLimit(text)` → error lists (checks done before parsing)
- `validateTrainingLog(parsed)` → `{ ok, data, errors, notices }`, where `data` is `{ headers, rows, columns, hasAccuracy }`: `headers`/`rows` are the cells as text (for the table) and `columns` maps each required column name to an array of numbers (for statistics, charts and diagnosis).

### `js/stats.js` — pure, no DOM

- `describe(values)` → `{ count, min, max, mean, median, std }` (sample std, n − 1)
- `formatFourDecimals(value)` → string with 4 decimals, rounded half up after 12 significant digits (spec §4.3); used by `ui.js` and the diagnosis texts
- `summarizeColumns(columns)` → `describe` for every metric column (all but `epoch`, which is only an index)
- `analyzeLog(columns, hasAccuracy)` → `{ bestEpoch, bestValLoss, bestValAcc, lossGap, accGap }`
- `diagnose(columns, hasAccuracy)` → a list of findings `{ anomaly, epochs, explanation, hint }`, plus the checks skipped for lack of epochs (rules in spec §4.6)

### `js/ui.js` — DOM only, no logic

Rendering helpers: messages, table (pagination + sorting), summary, log analysis, diagnosis. It always uses `textContent` or `document.createElement` for data, and never `innerHTML` with data.

### `js/charts.js`

- `createCurveCharts(lossCanvas, accCanvas)` → handles for the loss and accuracy charts
- `showCurves(handles, columns, hasAccuracy, bestEpoch)`, `setLogScale(handles, on)`
- `chartsAvailable()` → false when Chart.js did not load (no internet), so the page can say so instead of breaking

The best-epoch marker is drawn as an extra single-point dataset, so no Chart.js plugin is needed.

### `tests.html` + `js/tests.js`

A minimal test runner written in a few lines (no library). Each test shows pass/fail on the page. It covers `csv.js` and `stats.js`.

## 3. Libraries

Only one library is used. It is loaded as a classic script and exposes the global `Chart`.

| Library  | Version | URL                                                             |
| -------- | ------- | --------------------------------------------------------------- |
| Chart.js | 4.4.1   | `https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.js` |

The `<script>` tag uses this pinned URL, with no `integrity` hash. It is added in the charts task.

## 4. Security

No Content Security Policy is used. The security rules are in spec §5.2 and `reglesIA_claude.md` §5.

## 5. Key design decisions

- **One page, one log.** There is a single log at a time; loading a new valid file replaces it.
- **Pure logic, thin DOM layer.** Parsing, validation, statistics and diagnosis don't touch the page, so `tests.html` can test them.
- **Two views of the data.** The table shows the cells exactly as text (`rows`); everything that computes uses `columns`, the validated numbers per column, so no module parses numbers twice.
- **Explainable diagnosis.** Each anomaly is a simple rule with fixed thresholds (spec §4.6), written as a separate function in `stats.js`, so the student can read, test and tune each one.

## 6. How to run

From the `html/` folder:

```
python -m http.server 8000
```

Then open `http://localhost:8000` for the app, and `http://localhost:8000/tests.html` for the tests. Opening `index.html` directly from disk (`file://`) is not supported, because ES modules and the sample files need a server.
