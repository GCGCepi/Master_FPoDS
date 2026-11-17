# Project architecture

## File structure

```
practical claude version/OUTPUT/
├── README.md          # Explanation of the method (for humans)
├── exemple.csv        # Data
├── spec.md            # What the system must do
├── architecture.md    # How it is organized
├── tasks.md           # Pending tasks
├── reglesIA.md        # AI responsibility rules
└── html/              # Application directory
    ├── index.html     # Main page
    ├── styles.css     # Visual styles
    ├── app.js         # Application logic
    └── exemple.csv    # Copy of the data, next to the page for easy testing
```

## Responsibility of each application file

### `index.html`

Contains the page structure and the security headers:

- `Content-Security-Policy` and `referrer` meta tags,
- sticky top bar with the title and the light/dark toggle,
- drop zone with the (visually hidden) CSV file input,
- message area (`role="status"`, `role="alert"` for errors),
- results area, hidden until a valid file is loaded:
  - year filter,
  - summary tiles,
  - chart container (`<canvas>`) with a fallback message,
  - data table with sortable headers.

It contains **no inline JavaScript or CSS** (required by the CSP).

### `styles.css`

Contains the visual style:

- design tokens (colors, radius, shadow, fonts) as CSS custom properties on `:root`,
- a dark theme selected from the same tokens, applied by `prefers-color-scheme` **or** by `data-theme="dark"` on `<html>` (the manual toggle wins in both directions),
- card layout, drop zone, summary tiles, table with sticky header,
- status colors reserved for messages (info / success / error), always together with a text label,
- responsive rules (≤ 600 px) and `prefers-reduced-motion` support.

### `app.js`

Contains the application logic, wrapped in an IIFE with `"use strict"` (a classic script, because ES modules are blocked on `file://`). It is organized in sections:

| Section            | Main functions                                    |
| ------------------ | ------------------------------------------------- |
| Theme              | `applyTheme`, `currentTheme`, `readStoredTheme`   |
| File input         | change / drag & drop listeners, `loadFile`        |
| Parsing            | `parseCSV` (RFC 4180 quoting), `parseNumber`      |
| Validation         | `parseAndValidate`, `ValidationError`             |
| Rendering          | `renderAll`, `renderSummary`, `renderTable`, `sortRows`, `renderChart`, `buildYearFilter` |
| Messages           | `showMessage`, `handleError`                      |
| Helpers            | `el`, `uniqueInOrder`, `truncate`, `formatBytes`  |

Data flow:

```
File (picker / drop)
  → loadFile: extension, size checks
  → FileReader.readAsText
  → parseAndValidate → rows [{Any, Lloc, Sexe, Valor}]  (or ValidationError → handleError)
  → state.rows
  → renderAll(filteredRows by year) → summary + table + chart
```

## Libraries

- **Native JavaScript** (vanilla JS) to read the file and manipulate the DOM.
- **Chart.js 4.4.7** for the bar chart, loaded from jsDelivr with a pinned version and **Subresource Integrity**:

  ```html
  <script defer
          src="https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.js"
          integrity="sha384-zYPBGXwO4633CABX/5Spf6emCKUJCfoOkhOMYyxMsatqQZPnDblmmOewfjsIVWCM"
          crossorigin="anonymous"></script>
  ```

  If the library cannot be loaded (offline), the chart area shows a message and the rest of the page keeps working.

## Security

- **CSP:** `default-src 'none'`; scripts only from the page folder and `cdn.jsdelivr.net`; styles only from the page folder; `connect-src 'none'` so no data can be sent anywhere; `object-src`, `base-uri` and `form-action` disabled.
- **No HTML injection:** CSV values are inserted with `textContent` / `createTextNode` only. `innerHTML` is not used anywhere.
- **No prototype pollution:** only the four known columns are copied into new frozen objects; groupings use `Map`.
- **Resource limits:** 5 MB file size and 50,000 rows maximum.
- **Strict parsing:** numbers must match a numeric pattern and be finite (`"12abc"`, `"NaN"`, `"Infinity"` are rejected).

## Design decisions

- No backend — everything runs in the browser.
- No frameworks such as React or Vue — native JavaScript.
- The CSV is parsed manually (no parsing libraries), but supports quoted values.
- Validation is all-or-nothing: if any row is invalid, nothing is shown and the first problems are listed.
- The chart is destroyed and regenerated on every new file, filter change or theme change; its colors are read from the CSS variables so the chart matches the theme.
- Series colors come from a validated color-blind-safe palette in fixed order (slot 1 blue, slot 2 orange, slot 3 aqua); a `Sexe` value keeps its color when the year filter changes.
- System font stack — no web fonts, for speed and to keep the CSP strict.
- Statistics use the **population** standard deviation, as in the original version.
