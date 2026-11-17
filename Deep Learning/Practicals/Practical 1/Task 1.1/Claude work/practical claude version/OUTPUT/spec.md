# Project specification

## Objective

Create an HTML artifact that allows loading the CSV file `exemple.csv` located in this directory (or any CSV with the same format) and visualizing its data in a clear, modern and intuitive way. All processing happens in the browser; the data never leaves the user's computer.

## CSV format

The CSV file must have the following columns (names are case-sensitive, order is free, extra columns are ignored):

| Column | Description                        | Validation rule                         |
| ------ | ---------------------------------- | --------------------------------------- |
| Any    | Year of the data                   | Integer (e.g. `2026`)                   |
| Lloc   | Category or territory              | Non-empty text                          |
| Sexe   | Gender category                    | Non-empty text                          |
| Valor  | Numeric value                      | Integer or decimal, finite (`1200`, `3.5`) |

Additional format rules:

- Comma (`,`) is the separator. Values may be wrapped in double quotes (`"Quoted, value"`); a double quote inside a quoted value is written as `""`.
- The first line is the header. Empty lines are ignored. `\n` and `\r\n` line endings and a UTF-8 BOM are accepted.
- Limits: maximum file size **5 MB**, maximum **50,000** data rows.

Example of valid content:

```csv
Any,Lloc,Sexe,Valor
2026,Catalunya,Dona,1200
2026,Catalunya,Home,1150
2026,Espanya,Dona,800
2026,Espanya,Home,750
2026,Estranger,Dona,600
2026,Estranger,Home,650
```

## Main features

1. **File selection.** The user can select the CSV file from their computer with a file picker **or** by dragging and dropping it onto the page. Loading a new file replaces the previous one.
2. **Reading and validation.** The system reads the CSV and validates it against the rules above. A file is either loaded completely or not at all.
3. **Data table.** The data is shown in an HTML table with column headers. Clicking a header sorts the table by that column (ascending, then descending).
4. **Summary.** The system computes, for the visible rows: number of rows, total, mean, population standard deviation, minimum and maximum of `Valor`, and the number of unique `Lloc` and `Sexe` values.
5. **Chart.** The system generates a grouped bar chart of total `Valor` with `Lloc` on the x-axis and one series per `Sexe`, with a legend, axis titles and a tooltip showing exact values. A given `Sexe` always keeps the same color.
6. **Year filter.** The user can show all years or a single year (`Any`). The summary, chart and table update together.
7. **Error messages.** Clear error messages are shown if the file is not valid: wrong extension, empty file, too large, missing or duplicated columns, rows with a wrong number of values, non-numeric `Any`/`Valor`, empty `Lloc`/`Sexe`. Messages name the row and the offending value (up to 5 problems listed).
8. **Theme.** The page follows the operating system's light/dark preference and offers a button to switch manually; the choice is remembered when the browser allows it.

## Requirements

- The application must work in a modern web browser (current Chrome, Edge, Firefox, Safari), opened directly from disk (`html/index.html`).
- No backend server is required.
- Everything must work with HTML, CSS and JavaScript (no frameworks, no build step).
- Chart.js must be used for the charts.
- **Security:** the file content is untrusted. It must never be interpreted as HTML or code; the page must not send any data over the network.
- **Performance:** the page must render instantly (no web fonts, one small script and one stylesheet besides Chart.js).
- **Accessibility:** usable with keyboard, visible focus, sufficient contrast, chart has a text alternative and the table is the accessible view of the data.
- **Responsive:** usable at phone width (≈ 375 px) without horizontal page scrolling.
- The code must be simple, readable and commented.

## Acceptance criteria

The project will be considered complete if:

- `exemple.csv` can be loaded with the picker and with drag & drop.
- The data appears correctly in the HTML table and can be sorted by each column.
- The summary values are computed correctly (for `exemple.csv`, all years: 12 rows, total 10,110, mean 842.5, std. deviation 228.11, min 580, max 1,200).
- The bar chart is generated correctly and updates when the year filter changes.
- Clear error messages are shown for each invalid case listed in feature 7, and previous results are hidden.
- A value such as `<img src=x onerror=alert(1)>` in the CSV is shown as plain text.
- The page works in light and dark mode and at phone width.
- The code is organized and commented.

## AI implementation process

This project is implemented following the procedure defined in `reglesIA.md`.
Before generating code, the AI assistant must read `spec.md`, `architecture.md` and `tasks.md`.

The implementation must be done task by task. After each task:
mark it as done in `tasks.md`, inform the user and wait for confirmation
before continuing.
