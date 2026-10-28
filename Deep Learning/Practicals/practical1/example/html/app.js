/* ==========================================================================
   CSV Data Visualizer — application logic
   Reads a CSV file, validates it, shows a table, computes summary statistics
   and draws a grouped bar chart (total Valor by Lloc and Sexe) with Chart.js.
   No backend: everything runs in the browser.
   ========================================================================== */

// Columns the CSV must contain, as defined in spec.md.
const EXPECTED_COLUMNS = ["Any", "Lloc", "Sexe", "Valor"];

// Keep a reference to the current Chart.js instance so we can destroy it
// before drawing a new one (the chart is regenerated for every new file).
let chartInstance = null;

// --- DOM references -------------------------------------------------------
const fileInput = document.getElementById("csvFile");
const messageEl = document.getElementById("message");
const summarySection = document.getElementById("summarySection");
const summaryGrid = document.getElementById("summaryGrid");
const tableSection = document.getElementById("tableSection");
const dataTable = document.getElementById("dataTable");
const chartSection = document.getElementById("chartSection");
const chartCanvas = document.getElementById("chart");

// --- Entry point: react to a selected file --------------------------------
fileInput.addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (!file) {
    return;
  }

  showMessage("Loading file…", "info");

  const reader = new FileReader();

  reader.onload = () => {
    try {
      const rows = parseCSV(reader.result);
      validateColumns(rows);
      render(rows);
      showMessage(`File loaded correctly: ${rows.length} row(s).`, "success");
    } catch (err) {
      // Any validation/parse error ends up here with a clear message.
      handleError(err.message);
    }
  };

  reader.onerror = () => {
    handleError("The file could not be read.");
  };

  reader.readAsText(file);
});

// --- CSV parsing ----------------------------------------------------------
// Converts raw CSV text into a list of JavaScript objects keyed by header.
// Manual parsing (no external libraries), as required by architecture.md.
function parseCSV(text) {
  // Split into non-empty lines, tolerating both \n and \r\n line endings.
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    throw new Error("The file is empty.");
  }

  const headers = lines[0].split(",").map((h) => h.trim());

  if (lines.length < 2) {
    throw new Error("The file has no data rows (only the header).");
  }

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => v.trim());

    if (values.length !== headers.length) {
      throw new Error(
        `Row ${i + 1} has ${values.length} value(s) but ${headers.length} were expected.`
      );
    }

    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index];
    });
    rows.push(row);
  }

  return rows;
}

// --- Validation -----------------------------------------------------------
// Checks that all expected columns are present.
function validateColumns(rows) {
  const headers = Object.keys(rows[0]);
  const missing = EXPECTED_COLUMNS.filter((col) => !headers.includes(col));

  if (missing.length > 0) {
    throw new Error(
      `The CSV is missing the following column(s): ${missing.join(", ")}. ` +
        `Expected columns: ${EXPECTED_COLUMNS.join(", ")}.`
    );
  }
}

// Parses a "Valor" cell into a number, throwing if it is not numeric.
function parseValor(raw, rowIndex) {
  const value = Number(raw);
  if (Number.isNaN(value)) {
    throw new Error(
      `Row ${rowIndex + 2}: "Valor" must be numeric but found "${raw}".`
    );
  }
  return value;
}

// --- Rendering orchestration ---------------------------------------------
function render(rows) {
  renderTable(rows);
  renderSummary(rows);
  renderChart(rows);

  summarySection.classList.remove("hidden");
  tableSection.classList.remove("hidden");
  chartSection.classList.remove("hidden");
}

// --- Table ----------------------------------------------------------------
function renderTable(rows) {
  const headers = EXPECTED_COLUMNS;

  const thead =
    "<thead><tr>" +
    headers.map((h) => `<th>${escapeHtml(h)}</th>`).join("") +
    "</tr></thead>";

  const tbody =
    "<tbody>" +
    rows
      .map(
        (row) =>
          "<tr>" +
          headers.map((h) => `<td>${escapeHtml(row[h])}</td>`).join("") +
          "</tr>"
      )
      .join("") +
    "</tbody>";

  dataTable.innerHTML = thead + tbody;
}

// --- Summary statistics ---------------------------------------------------
// Computes total, mean and (population) standard deviation of Valor, plus
// row count and number of unique Lloc/Sexe categories.
function renderSummary(rows) {
  const valores = rows.map((row, i) => parseValor(row.Valor, i));

  const total = valores.reduce((acc, v) => acc + v, 0);
  const mean = total / valores.length;
  const variance =
    valores.reduce((acc, v) => acc + (v - mean) ** 2, 0) / valores.length;
  const stdDev = Math.sqrt(variance);

  const uniqueLloc = new Set(rows.map((r) => r.Lloc)).size;
  const uniqueSexe = new Set(rows.map((r) => r.Sexe)).size;

  const items = [
    { label: "Rows", value: rows.length },
    { label: "Total Valor", value: formatNumber(total) },
    { label: "Mean Valor", value: formatNumber(mean) },
    { label: "Std. deviation", value: formatNumber(stdDev) },
    { label: "Unique Lloc", value: uniqueLloc },
    { label: "Unique Sexe", value: uniqueSexe },
  ];

  summaryGrid.innerHTML = items
    .map(
      (item) =>
        `<div class="summary-item">` +
        `<span class="label">${escapeHtml(item.label)}</span>` +
        `<span class="value">${escapeHtml(String(item.value))}</span>` +
        `</div>`
    )
    .join("");
}

// --- Chart ----------------------------------------------------------------
// Groups data by Lloc (x-axis) and Sexe (series), summing Valor for each
// combination, then draws a grouped bar chart with Chart.js.
function renderChart(rows) {
  const locations = [...new Set(rows.map((r) => r.Lloc))];
  const sexes = [...new Set(rows.map((r) => r.Sexe))];

  // totals[sexe][lloc] = sum of Valor
  const totals = {};
  sexes.forEach((sexe) => {
    totals[sexe] = {};
    locations.forEach((lloc) => (totals[sexe][lloc] = 0));
  });

  rows.forEach((row, i) => {
    totals[row.Sexe][row.Lloc] += parseValor(row.Valor, i);
  });

  const palette = ["#2563eb", "#e11d48", "#16a34a", "#d97706", "#7c3aed"];

  const datasets = sexes.map((sexe, index) => ({
    label: sexe,
    data: locations.map((lloc) => totals[sexe][lloc]),
    backgroundColor: palette[index % palette.length],
  }));

  // Regenerate: destroy any previous chart first.
  if (chartInstance) {
    chartInstance.destroy();
  }

  chartInstance = new Chart(chartCanvas, {
    type: "bar",
    data: {
      labels: locations,
      datasets: datasets,
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: "Total Valor by Lloc and Sexe",
        },
        legend: {
          position: "top",
        },
      },
      scales: {
        x: {
          title: { display: true, text: "Lloc" },
        },
        y: {
          beginAtZero: true,
          title: { display: true, text: "Valor" },
        },
      },
    },
  });
}

// --- Helpers --------------------------------------------------------------
function showMessage(text, type) {
  messageEl.textContent = text;
  messageEl.className = "message " + (type || "");
}

function handleError(text) {
  // On error, hide result sections and show a clear message.
  summarySection.classList.add("hidden");
  tableSection.classList.add("hidden");
  chartSection.classList.add("hidden");
  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }
  showMessage("Error: " + text, "error");
}

// Format numbers with up to 2 decimals and thousands separators.
function formatNumber(n) {
  return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

// Escape text before inserting it into the DOM to avoid broken markup.
function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
