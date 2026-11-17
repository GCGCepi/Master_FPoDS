/* ==========================================================================
   CSV Data Visualizer — application logic
   Reads a CSV file, validates it, shows a sortable table, computes summary
   statistics and draws a grouped bar chart (total Valor by Lloc and Sexe)
   with Chart.js. Everything runs in the browser: no data leaves the page.

   Security notes (see architecture.md → "Security"):
   - File content is treated as untrusted. It is only ever inserted into the
     page with textContent / createTextNode, never with innerHTML.
   - Only the four known columns are copied into row objects, and groupings use
     Map, so header names such as "__proto__" cannot pollute objects.
   - File size and row count are capped to keep the page responsive.
   ========================================================================== */

(function () {
  "use strict";

  // --- Configuration (from spec.md) ----------------------------------------
  const EXPECTED_COLUMNS = ["Any", "Lloc", "Sexe", "Valor"];
  const NUMERIC_COLUMNS = new Set(["Any", "Valor"]);
  const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB
  const MAX_ROWS = 50000;
  const MAX_ERRORS_SHOWN = 5;
  const ALL_YEARS = "all";
  const THEME_KEY = "csv-visualizer-theme";

  // --- DOM references -------------------------------------------------------
  const $ = (id) => document.getElementById(id);
  const fileInput = $("csvFile");
  const dropzone = $("dropzone");
  const fileMeta = $("fileMeta");
  const messageEl = $("message");
  const resultsEl = $("results");
  const yearFilter = $("yearFilter");
  const summaryGrid = $("summaryGrid");
  const chartCanvas = $("chart");
  const chartNote = $("chartNote");
  const chartFallback = $("chartFallback");
  const tableHead = $("tableHead");
  const tableBody = $("tableBody");
  const tableNote = $("tableNote");
  const themeToggle = $("themeToggle");

  // --- Formatters -----------------------------------------------------------
  const numberFmt = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });
  const integerFmt = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
  const yearFmt = { format: (n) => String(n) }; // years without thousands separator

  // --- Application state ----------------------------------------------------
  const state = {
    rows: [],          // all validated rows: { Any, Lloc, Sexe, Valor }
    year: ALL_YEARS,   // current year filter
    sexes: [],         // series order, fixed per file (color follows the entity)
    sortKey: null,     // column currently sorted
    sortDir: 1,        // 1 ascending, -1 descending
    chart: null,       // Chart.js instance
  };

  // ==========================================================================
  // Theme (light / dark) — follows the OS unless the user chose one.
  // ==========================================================================
  function readStoredTheme() {
    try {
      const value = localStorage.getItem(THEME_KEY);
      return value === "light" || value === "dark" ? value : null;
    } catch (_) {
      return null; // storage can be blocked (private mode, file://)
    }
  }

  function currentTheme() {
    const forced = document.documentElement.getAttribute("data-theme");
    if (forced === "light" || forced === "dark") return forced;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    themeToggle.setAttribute("aria-pressed", String(theme === "dark"));
    if (state.chart) renderChart(); // chart colors come from CSS variables
  }

  const storedTheme = readStoredTheme();
  if (storedTheme) applyTheme(storedTheme);
  themeToggle.setAttribute("aria-pressed", String(currentTheme() === "dark"));

  themeToggle.addEventListener("click", () => {
    const next = currentTheme() === "dark" ? "light" : "dark";
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch (_) {
      /* not critical */
    }
    applyTheme(next);
  });

  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if (!readStoredTheme() && state.chart) renderChart();
  });

  // ==========================================================================
  // File input: picker + drag & drop
  // ==========================================================================
  fileInput.addEventListener("change", () => {
    const file = fileInput.files && fileInput.files[0];
    if (file) loadFile(file);
    fileInput.value = ""; // allow re-selecting the same file
  });

  ["dragenter", "dragover"].forEach((type) =>
    dropzone.addEventListener(type, (event) => {
      event.preventDefault();
      dropzone.classList.add("is-dragover");
    })
  );

  ["dragleave", "dragend", "drop"].forEach((type) =>
    dropzone.addEventListener(type, () => dropzone.classList.remove("is-dragover"))
  );

  dropzone.addEventListener("drop", (event) => {
    event.preventDefault();
    const files = event.dataTransfer && event.dataTransfer.files;
    if (!files || files.length === 0) return;
    if (files.length > 1) {
      showMessage("error", "Please drop a single CSV file.");
      return;
    }
    loadFile(files[0]);
  });

  // Prevent the browser from navigating to a file dropped outside the zone.
  ["dragover", "drop"].forEach((type) =>
    window.addEventListener(type, (event) => event.preventDefault())
  );

  // --- Read and process one file -------------------------------------------
  function loadFile(file) {
    // Cheap checks before reading anything.
    if (!/\.csv$/i.test(file.name)) {
      return handleError("The selected file is not a .csv file.", [`Received: ${file.name}`]);
    }
    if (file.size === 0) {
      return handleError("The file is empty.");
    }
    if (file.size > MAX_FILE_BYTES) {
      return handleError(
        `The file is too large (${formatBytes(file.size)}). The maximum size is ${formatBytes(MAX_FILE_BYTES)}.`
      );
    }

    showMessage("info", "Loading file…");

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const rows = parseAndValidate(String(reader.result));
        state.rows = rows;
        state.year = ALL_YEARS;
        state.sortKey = null;
        state.sortDir = 1;
        state.sexes = uniqueInOrder(rows.map((r) => r.Sexe));

        setFileMeta(file, rows.length);
        buildYearFilter(rows);
        renderAll();
        resultsEl.classList.remove("hidden");
        showMessage("success", `File loaded correctly: ${integerFmt.format(rows.length)} row(s).`);
      } catch (err) {
        if (err instanceof ValidationError) {
          handleError(err.message, err.details);
        } else {
          console.error(err);
          handleError("Unexpected error while processing the file.");
        }
      }
    };
    reader.onerror = () => handleError("The file could not be read.");
    reader.readAsText(file);
  }

  // ==========================================================================
  // CSV parsing and validation
  // ==========================================================================
  class ValidationError extends Error {
    constructor(message, details) {
      super(message);
      this.details = details || [];
    }
  }

  /**
   * Splits CSV text into an array of records (arrays of strings).
   * Supports RFC 4180 quoting ("a,b", "he said ""hi"""), CRLF/LF line endings
   * and a UTF-8 BOM. Blank lines are skipped.
   */
  function parseCSV(text) {
    if (text.charCodeAt(0) === 0xfeff) text = text.slice(1); // strip BOM

    const records = [];
    let record = [];
    let field = "";
    let inQuotes = false;

    const pushRecord = () => {
      record.push(field);
      // Skip lines that are completely empty.
      if (!(record.length === 1 && record[0].trim() === "")) records.push(record);
      record = [];
      field = "";
    };

    for (let i = 0; i < text.length; i++) {
      const ch = text[i];

      if (inQuotes) {
        if (ch === '"') {
          if (text[i + 1] === '"') {
            field += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          field += ch;
        }
        continue;
      }

      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        record.push(field);
        field = "";
      } else if (ch === "\n") {
        pushRecord();
      } else if (ch === "\r") {
        if (text[i + 1] === "\n") i++;
        pushRecord();
      } else {
        field += ch;
      }

      if (records.length > MAX_ROWS + 1) {
        throw new ValidationError(
          `The file has more than ${integerFmt.format(MAX_ROWS)} rows, which is the maximum supported.`
        );
      }
    }

    if (inQuotes) {
      throw new ValidationError("The file has a quoted value that is never closed (missing \").");
    }
    if (field !== "" || record.length > 0) pushRecord();

    return records;
  }

  /** Parses the text and returns validated rows, or throws ValidationError. */
  function parseAndValidate(text) {
    const records = parseCSV(text);

    if (records.length === 0) {
      throw new ValidationError("The file is empty.");
    }

    const headers = records[0].map((h) => h.trim());

    // Duplicate headers would make the meaning of a column ambiguous.
    const duplicates = headers.filter((h, i) => h !== "" && headers.indexOf(h) !== i);
    if (duplicates.length > 0) {
      throw new ValidationError(`Duplicated column name(s): ${[...new Set(duplicates)].join(", ")}.`);
    }

    const missing = EXPECTED_COLUMNS.filter((col) => !headers.includes(col));
    if (missing.length > 0) {
      const caseHints = missing
        .map((col) => {
          const near = headers.find((h) => h.toLowerCase() === col.toLowerCase());
          return near ? `Found "${near}" — column names are case-sensitive, expected "${col}".` : null;
        })
        .filter(Boolean);
      throw new ValidationError(
        `The CSV is missing the following column(s): ${missing.join(", ")}.`,
        [`Expected columns: ${EXPECTED_COLUMNS.join(", ")}.`, `Found: ${headers.join(", ") || "(none)"}.`, ...caseHints]
      );
    }

    if (records.length < 2) {
      throw new ValidationError("The file has no data rows (only the header).");
    }

    const index = {};
    EXPECTED_COLUMNS.forEach((col) => (index[col] = headers.indexOf(col)));

    const rows = [];
    const errors = [];
    let errorCount = 0;
    const addError = (msg) => {
      errorCount++;
      if (errors.length < MAX_ERRORS_SHOWN) errors.push(msg);
    };

    for (let r = 1; r < records.length; r++) {
      const values = records[r];
      const line = r + 1; // 1-based line number as seen in a text editor

      if (values.length !== headers.length) {
        addError(`Row ${line}: has ${values.length} value(s) but ${headers.length} were expected.`);
        continue;
      }

      const any = values[index.Any].trim();
      const lloc = values[index.Lloc].trim();
      const sexe = values[index.Sexe].trim();
      const valorRaw = values[index.Valor].trim();
      let rowOk = true;

      if (!/^-?\d+$/.test(any)) {
        addError(`Row ${line}: "Any" must be an integer year but found "${truncate(any)}".`);
        rowOk = false;
      }
      if (lloc === "") {
        addError(`Row ${line}: "Lloc" is empty.`);
        rowOk = false;
      }
      if (sexe === "") {
        addError(`Row ${line}: "Sexe" is empty.`);
        rowOk = false;
      }
      const valor = parseNumber(valorRaw);
      if (valor === null) {
        addError(`Row ${line}: "Valor" must be numeric but found "${truncate(valorRaw)}".`);
        rowOk = false;
      }

      // Only the four known columns are kept; extra columns are ignored.
      if (rowOk) rows.push(Object.freeze({ Any: Number(any), Lloc: lloc, Sexe: sexe, Valor: valor }));
    }

    if (errorCount > 0) {
      const details = errors.slice();
      if (errorCount > errors.length) details.push(`…and ${errorCount - errors.length} more problem(s).`);
      throw new ValidationError(`The file contains ${errorCount} invalid value(s). Nothing was loaded.`, details);
    }

    return rows;
  }

  /** Strict number parser: accepts "12", "-3.5", "1e3"; rejects "", "12abc", "NaN", "Infinity". */
  function parseNumber(raw) {
    if (!/^[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?$/.test(raw)) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }

  // ==========================================================================
  // Rendering
  // ==========================================================================
  function filteredRows() {
    if (state.year === ALL_YEARS) return state.rows;
    return state.rows.filter((r) => String(r.Any) === state.year);
  }

  function renderAll() {
    const rows = filteredRows();
    const scope = state.year === ALL_YEARS ? "all years" : state.year;
    chartNote.textContent = `Scope: ${scope}`;
    tableNote.textContent = `${integerFmt.format(rows.length)} row(s) · ${scope}`;
    renderSummary(rows);
    renderTable(rows);
    renderChart();
  }

  // --- Year filter ----------------------------------------------------------
  function buildYearFilter(rows) {
    const years = uniqueInOrder(rows.map((r) => r.Any)).sort((a, b) => b - a);
    yearFilter.replaceChildren(new Option("All years", ALL_YEARS));
    years.forEach((y) => yearFilter.append(new Option(String(y), String(y))));
    yearFilter.value = ALL_YEARS;
    yearFilter.disabled = years.length < 2;
  }

  yearFilter.addEventListener("change", () => {
    state.year = yearFilter.value;
    renderAll();
  });

  // --- Summary --------------------------------------------------------------
  // Total, mean, population standard deviation, min and max of Valor,
  // plus row count and number of unique categories.
  function renderSummary(rows) {
    const values = rows.map((r) => r.Valor);
    const n = values.length;
    const total = values.reduce((acc, v) => acc + v, 0);
    const mean = n ? total / n : 0;
    const variance = n ? values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / n : 0;

    const items = [
      ["Rows", integerFmt.format(n)],
      ["Total Valor", numberFmt.format(total)],
      ["Mean Valor", numberFmt.format(mean)],
      ["Std. deviation", numberFmt.format(Math.sqrt(variance))],
      ["Min Valor", n ? numberFmt.format(Math.min(...values)) : "—"],
      ["Max Valor", n ? numberFmt.format(Math.max(...values)) : "—"],
      ["Unique Lloc", integerFmt.format(new Set(rows.map((r) => r.Lloc)).size)],
      ["Unique Sexe", integerFmt.format(new Set(rows.map((r) => r.Sexe)).size)],
    ];

    const fragment = document.createDocumentFragment();
    items.forEach(([label, value]) => {
      const tile = el("div", "kpi");
      tile.append(el("span", "kpi-label", label), el("span", "kpi-value", value));
      fragment.append(tile);
    });
    summaryGrid.replaceChildren(fragment);
  }

  // --- Table (sortable) -----------------------------------------------------
  function renderTable(rows) {
    // Header with sort buttons
    const headFragment = document.createDocumentFragment();
    EXPECTED_COLUMNS.forEach((col) => {
      const th = el("th", col === "Valor" ? "num" : "");
      th.scope = "col";
      th.setAttribute(
        "aria-sort",
        state.sortKey === col ? (state.sortDir === 1 ? "ascending" : "descending") : "none"
      );
      const button = el("button", "sort-button");
      button.type = "button";
      const arrow = state.sortKey === col ? (state.sortDir === 1 ? "▲" : "▼") : "↕";
      button.append(document.createTextNode(col), el("span", "sort-indicator", arrow));
      button.querySelector(".sort-indicator").setAttribute("aria-hidden", "true");
      button.addEventListener("click", () => {
        if (state.sortKey === col) {
          state.sortDir = -state.sortDir;
        } else {
          state.sortKey = col;
          state.sortDir = 1;
        }
        renderTable(filteredRows());
        tableHead.querySelector(`th:nth-child(${EXPECTED_COLUMNS.indexOf(col) + 1}) button`).focus();
      });
      th.append(button);
      headFragment.append(th);
    });
    tableHead.replaceChildren(headFragment);

    // Body
    const sorted = sortRows(rows);
    const bodyFragment = document.createDocumentFragment();
    if (sorted.length === 0) {
      const tr = document.createElement("tr");
      const td = el("td", "", "No data to show.");
      td.colSpan = EXPECTED_COLUMNS.length;
      tr.append(td);
      bodyFragment.append(tr);
    } else {
      sorted.forEach((row) => {
        const tr = document.createElement("tr");
        tr.append(
          el("td", "", yearFmt.format(row.Any)),
          el("td", "", row.Lloc),
          el("td", "", row.Sexe),
          el("td", "num", numberFmt.format(row.Valor))
        );
        bodyFragment.append(tr);
      });
    }
    tableBody.replaceChildren(bodyFragment);
  }

  function sortRows(rows) {
    if (!state.sortKey) return rows;
    const key = state.sortKey;
    const dir = state.sortDir;
    const collator = new Intl.Collator(undefined, { sensitivity: "base", numeric: true });
    return rows.slice().sort((a, b) => {
      const result = NUMERIC_COLUMNS.has(key) ? a[key] - b[key] : collator.compare(a[key], b[key]);
      return result * dir;
    });
  }

  // --- Chart ----------------------------------------------------------------
  // Groups by Lloc (x-axis) and Sexe (series), summing Valor for each pair.
  function renderChart() {
    if (typeof window.Chart === "undefined") {
      chartCanvas.classList.add("hidden");
      chartFallback.classList.remove("hidden");
      return;
    }
    chartCanvas.classList.remove("hidden");
    chartFallback.classList.add("hidden");

    const rows = filteredRows();
    const locations = uniqueInOrder(rows.map((r) => r.Lloc));

    // totals: Map<Sexe, Map<Lloc, sum>>
    const totals = new Map(state.sexes.map((s) => [s, new Map(locations.map((l) => [l, 0]))]));
    rows.forEach((r) => {
      const bySexe = totals.get(r.Sexe);
      bySexe.set(r.Lloc, bySexe.get(r.Lloc) + r.Valor);
    });

    const css = getComputedStyle(document.documentElement);
    const token = (name) => css.getPropertyValue(name).trim();
    const palette = [token("--series-1"), token("--series-2"), token("--series-3")];
    const surface = token("--surface-1");
    const textSecondary = token("--text-secondary");
    const textMuted = token("--text-muted");
    const grid = token("--grid");

    // Colors follow the entity: index in the file-wide series list, not the filtered one.
    const datasets = state.sexes.map((sexe, i) => ({
      label: sexe,
      data: locations.map((l) => totals.get(sexe).get(l)),
      backgroundColor: palette[i] || textMuted, // >3 series fall back to neutral (spec: Sexe has few values)
      hoverBackgroundColor: palette[i] || textMuted,
      borderColor: surface,
      borderWidth: { top: 0, left: 1, right: 1, bottom: 0 }, // 2px surface gap between adjacent bars
      borderRadius: { topLeft: 4, topRight: 4 },
      borderSkipped: "bottom",
      maxBarThickness: 56,
    }));

    if (state.chart) {
      state.chart.destroy();
      state.chart = null;
    }

    window.Chart.defaults.font.family = token("--font") || "system-ui, sans-serif";

    state.chart = new window.Chart(chartCanvas, {
      type: "bar",
      data: { labels: locations, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 350 },
        interaction: { mode: "index", intersect: false },
        categoryPercentage: 0.7,
        barPercentage: 0.95,
        plugins: {
          legend: {
            position: "top",
            align: "start",
            labels: { color: textSecondary, usePointStyle: true, pointStyle: "rectRounded", boxHeight: 8, padding: 16 },
          },
          tooltip: {
            backgroundColor: token("--surface-1"),
            titleColor: token("--text-primary"),
            bodyColor: textSecondary,
            borderColor: token("--border"),
            borderWidth: 1,
            padding: 10,
            usePointStyle: true,
            callbacks: {
              label: (ctx) => ` ${numberFmt.format(ctx.parsed.y)}  ${ctx.dataset.label}`,
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            border: { color: grid },
            ticks: { color: textSecondary },
            title: { display: true, text: "Lloc", color: textMuted },
          },
          y: {
            beginAtZero: true,
            grid: { color: grid },
            border: { display: false },
            ticks: { color: textMuted, callback: (v) => numberFmt.format(v) },
            title: { display: true, text: "Total Valor", color: textMuted },
          },
        },
      },
    });

    // Accessible text alternative for the canvas.
    const summary = locations
      .map((l) => `${l}: ${state.sexes.map((s) => `${s} ${numberFmt.format(totals.get(s).get(l))}`).join(", ")}`)
      .join("; ");
    chartCanvas.setAttribute("aria-label", `Grouped bar chart of total Valor by Lloc and Sexe. ${summary}`);
  }

  // ==========================================================================
  // Messages and errors
  // ==========================================================================
  function showMessage(type, text, details) {
    const fragment = document.createDocumentFragment();
    const label = { error: "Error: ", success: "Done: ", info: "" }[type] || "";
    if (label) fragment.append(el("strong", "", label));
    fragment.append(document.createTextNode(text));
    if (details && details.length) {
      const ul = document.createElement("ul");
      details.forEach((d) => ul.append(el("li", "", d)));
      fragment.append(ul);
    }
    messageEl.replaceChildren(fragment);
    messageEl.className = `message ${type}`;
    messageEl.setAttribute("role", type === "error" ? "alert" : "status");
  }

  function handleError(text, details) {
    // On error, hide the previous results so they are not mistaken for the new file.
    resultsEl.classList.add("hidden");
    fileMeta.classList.add("hidden");
    if (state.chart) {
      state.chart.destroy();
      state.chart = null;
    }
    state.rows = [];
    showMessage("error", text, details);
  }

  // ==========================================================================
  // Helpers
  // ==========================================================================
  /** Creates an element with an optional class and text (always as text, never HTML). */
  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function uniqueInOrder(values) {
    return [...new Set(values)];
  }

  function truncate(value, max = 40) {
    return value.length > max ? value.slice(0, max) + "…" : value;
  }

  function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${numberFmt.format(bytes / 1024)} KB`;
    return `${numberFmt.format(bytes / (1024 * 1024))} MB`;
  }

  function setFileMeta(file, rowCount) {
    fileMeta.textContent = `${file.name} · ${formatBytes(file.size)} · ${integerFmt.format(rowCount)} rows — select or drop another file to replace it`;
    fileMeta.classList.remove("hidden");
  }
})();
