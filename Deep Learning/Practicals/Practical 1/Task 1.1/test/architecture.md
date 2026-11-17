# Project architecture

## File structure

```
Practical 0/
├── exemple.csv        # Data
├── spec.md            # What the system must do
├── architecture.md    # How it is organized
├── tasks.md           # Pending tasks
├── reglesIA.md        # AI responsibility rules
└── html/              # Application directory
    ├── index.html     # Main page
    ├── styles.css     # Visual styles
    └── app.js         # Application logic
```

## Responsibility of each application file

### `index.html`

Contains the page structure:

- page title,
- CSV file selector,
- summary area with computed values,
- data table,
- chart container.

### `styles.css`

Contains the visual style:

- readable typography,
- appropriate margins and spacing,
- differentiated colors for sections,
- table formatting with highlighted headers,
- responsive design.

### `app.js`

Contains the application logic:

- reading the CSV file with `FileReader`,
- converting the CSV text into JavaScript objects,
- validating the expected columns,
- generating the HTML table,
- computing totals and summaries,
- generating the chart with Chart.js.

## Libraries

To keep the project simple, we will use:

- **Native JavaScript** (vanilla JS) to read the file and manipulate the DOM.

- **Chart.js** (version 4.x) to generate the bar chart.
  
  - It will be loaded from a CDN in the HTML file:
    
    ```html
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    ```

## Design decisions

- We will not use a backend — everything runs in the browser.
- We will not use frameworks such as React or Vue — native JavaScript.
- The project must be easy to understand for students who are just starting.
- The CSV is parsed manually (without external parsing libraries).
- The chart is regenerated every time a new file is loaded.
