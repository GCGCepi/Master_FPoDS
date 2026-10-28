# Project specification

## Objective

Create an HTML artifact that allows loading the CSV file `exemple.csv` located in this directory and visualizing its data in a clear and intuitive way.

## CSV format

The CSV file must have the following columns:

| Column | Description                        |
| ------ | ---------------------------------- |
| Any    | Year of the data (integer)         |
| Lloc   | Category or territory (text)       |
| Sexe   | Gender category (text)             |
| Valor  | Numeric value (integer or decimal) |

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

1. The user must be able to select the CSV file from their computer.
2. The system must read the CSV content and validate it.
3. The system must display the data in an HTML table.
4. The system must compute summary values of the numeric columns (mean, deviation).
5. The system must generate a bar chart grouped by `Lloc` and `Sexe`.
6. The system must show error messages if the file is not valid.

## Requirements

- The application must work in a modern web browser.
- No backend server is required.
- Everything must work with HTML, CSS and JavaScript.
- The code must be simple and readable.
- Chart.js must be used for the charts.

## Acceptance criteria

The project will be considered complete if:

- A CSV file with the expected format can be loaded.
- The data appears correctly in an HTML table.
- The summary values are computed correctly.
- The bar chart is generated correctly.
- Clear error messages are shown if the file is not valid.
- The code is organized and commented.

## AI implementation process

This project is implemented following the procedure defined in `reglesIA.md`.
Before generating code, the AI assistant must read `spec.md`, `architecture.md` and `tasks.md`.

The implementation must be done task by task. After each task:
mark it as done in `tasks.md`, inform the user and wait for confirmation
before continuing.
