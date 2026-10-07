# Project tasks

## Phase 1. Basic structure

- [x] Create `index.html` with the HTML structure (top bar, drop zone, message, results area)
- [x] Add the Content-Security-Policy and referrer meta tags
- [x] Create `styles.css` with design tokens and the basic styles
- [x] Create `app.js` (strict-mode IIFE) with the main sections
- [x] Add the CSV file selector to the HTML

## Phase 2. Data reading

- [x] Read the CSV file with `FileReader`
- [x] Check extension, empty file and maximum size before reading
- [x] Parse the CSV (quotes, CRLF, BOM, blank lines) into records
- [x] Validate that the CSV has the expected columns (`Any`, `Lloc`, `Sexe`, `Valor`) and no duplicates
- [x] Validate every row (value count, integer `Any`, non-empty `Lloc`/`Sexe`, numeric `Valor`)
- [x] Convert valid rows into JavaScript objects

## Phase 3. Tabular visualization

- [x] Display the data in an HTML table using `textContent` only
- [x] Add column headers
- [x] Make columns sortable by clicking the header (with `aria-sort`)
- [x] Show a message if there is no data

## Phase 4. Statistical summary

- [x] Compute the total of the `Valor` column
- [x] Compute the mean and standard deviation of `Valor`
- [x] Compute the minimum and maximum of `Valor`
- [x] Count the number of rows and unique categories
- [x] Show the results as summary tiles

## Phase 5. Chart

- [x] Group the data by `Lloc` and `Sexe` (using `Map`)
- [x] Compute the total of `Valor` for each combination
- [x] Generate a bar chart with Chart.js (pinned version + SRI)
- [x] Add a legend, axis titles and value tooltips
- [x] Read chart colors from the CSS variables (light/dark)
- [x] Show a fallback message if Chart.js is not available

## Phase 6. Filters and interaction

- [x] Add a year (`Any`) filter that updates summary, chart and table
- [x] Add drag & drop loading
- [x] Add the light/dark theme toggle (remembered if storage is available)

## Phase 7. Final improvements

- [x] Add visual styles (colors, spacing, typography, responsive layout)
- [x] Add detailed error messages for invalid files (row number + value)
- [x] Add a loading message while processing
- [x] Review accessibility (keyboard, focus, contrast, chart text alternative)
- [x] Review the code and add comments
- [x] Test with different CSV files (valid, empty, missing column, non-numeric, HTML in values)
- [x] Inform the user that the development process has been completed.
