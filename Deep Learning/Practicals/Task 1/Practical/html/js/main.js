// Entry point: connects the page to the logic modules.
// It holds the application state and registers the event listeners.

import { parseCsv, checkFile, checkRowLimit, validateTrainingLog } from './csv.js';
import { summarizeColumns, analyzeLog } from './stats.js';
import {
  showMessage, showErrors, renderTable, renderSummary, renderKeyFigures, formatSize,
} from './ui.js';
import {
  chartsAvailable, createCurveCharts, showCurves, setLogScale,
} from './charts.js';

// All application state lives in this one object.
const state = {
  // { fileName, fileSize, headers, rows, columns, hasAccuracy, analysis }
  // headers/rows: the cells as text (for the table);
  // columns: the numbers of each log column (for statistics, charts and diagnosis);
  // analysis: best epoch and gaps (from analyzeLog).
  log: null,
  charts: null, // Chart.js handles, created when the first log is shown
};

const SAMPLE_URL = 'data/training_log.csv';

const fileInput = document.getElementById('file-input');
const sampleButton = document.getElementById('sample-button');
const dropZone = document.getElementById('drop-zone');
const messages = document.getElementById('messages');
const tableContainer = document.getElementById('data-table');
const summaryContainer = document.getElementById('summary');
const keyFiguresContainer = document.getElementById('key-figures');
const chartsPlaceholder = document.getElementById('charts-placeholder');
const chartsContainer = document.getElementById('charts');
const logScaleToggle = document.getElementById('log-scale');

/**
 * Draws the training curves of the current log, creating the charts the
 * first time. If Chart.js could not be loaded, a message is shown instead.
 * @returns {void}
 */
function showCharts() {
  if (!chartsAvailable()) {
    chartsPlaceholder.textContent = 'The charts could not be drawn because the Chart.js library did not load. Check your internet connection and reload the page.';
    return;
  }
  // The charts are created only once their box is visible, so Chart.js can measure it.
  chartsPlaceholder.hidden = true;
  chartsContainer.hidden = false;
  if (!state.charts) {
    state.charts = createCurveCharts(document.getElementById('loss-chart'), document.getElementById('acc-chart'));
  }
  showCurves(state.charts, state.log.columns, state.log.hasAccuracy, state.log.analysis.bestEpoch);
  setLogScale(state.charts, logScaleToggle.checked);
}

/**
 * Shows why a file was rejected. The current log is not touched.
 * @param {string} fileName - name of the rejected file
 * @param {string[]} errors - error messages
 * @returns {void}
 */
function rejectFile(fileName, errors) {
  const count = errors.length === 1 ? '1 problem' : `${errors.length} problems`;
  const kept = state.log ? ` The previous log ("${state.log.fileName}") is still loaded.` : '';
  showErrors(messages, `Could not load "${fileName}": ${count} found.${kept}`, errors);
}

/**
 * Checks and reads a training log file. If it is valid, it becomes the
 * current log and is shown; otherwise the errors are shown and the previous
 * log stays (spec §4.2).
 * @param {File} file - file chosen by the user
 * @returns {Promise<void>}
 */
async function loadFile(file) {
  // Type and size are checked before reading, so a huge file never freezes the page.
  const fileErrors = checkFile(file.name, file.size);
  if (fileErrors.length > 0) {
    rejectFile(file.name, fileErrors);
    return;
  }

  let text;
  try {
    text = await file.text();
  } catch {
    rejectFile(file.name, ['The file could not be read. Check that it is not open in another program and try again.']);
    return;
  }

  const rowErrors = checkRowLimit(text);
  if (rowErrors.length > 0) {
    rejectFile(file.name, rowErrors);
    return;
  }

  const result = validateTrainingLog(parseCsv(text));
  if (!result.ok) {
    rejectFile(file.name, result.errors);
    return;
  }

  const analysis = analyzeLog(result.data.columns, result.data.hasAccuracy);
  state.log = { fileName: file.name, fileSize: file.size, ...result.data, analysis };
  showCharts();
  renderTable(tableContainer, state.log.headers, state.log.rows);
  renderKeyFigures(keyFiguresContainer, analysis);
  renderSummary(summaryContainer, summarizeColumns(state.log.columns));
  const loaded = `${file.name} (${formatSize(file.size)}) — ${state.log.rows.length} rows loaded.`;
  showMessage(messages, [loaded, ...result.notices].join(' '));
}

/**
 * Loads the sample log shipped with the app. It is turned into a File so it
 * goes through exactly the same checks as a file chosen by the user.
 * @returns {Promise<void>}
 */
async function loadSample() {
  const fileName = SAMPLE_URL.split('/').pop();
  try {
    const response = await fetch(SAMPLE_URL);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const blob = await response.blob();
    await loadFile(new File([blob], fileName, { type: 'text/csv' }));
  } catch {
    rejectFile(fileName, ['The sample log could not be loaded. Open the page through the local server (python -m http.server in the html folder) and try again.']);
  }
}

sampleButton.addEventListener('click', loadSample);

logScaleToggle.addEventListener('change', () => {
  if (state.charts) setLogScale(state.charts, logScaleToggle.checked);
});

// The chart colors come from CSS variables, so the charts are redrawn when
// the system switches between light and dark mode.
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if (state.log) showCharts();
});

fileInput.addEventListener('change', () => {
  const file = fileInput.files[0];
  if (file) loadFile(file);
  // Clearing the value lets the user pick the same file again after editing it.
  fileInput.value = '';
});

dropZone.addEventListener('dragover', (event) => {
  event.preventDefault(); // needed so the browser allows the drop
  dropZone.classList.add('drag-over');
});

dropZone.addEventListener('dragleave', () => {
  dropZone.classList.remove('drag-over');
});

dropZone.addEventListener('drop', (event) => {
  event.preventDefault();
  dropZone.classList.remove('drag-over');
  const file = event.dataTransfer.files[0];
  if (file) loadFile(file);
});

// A file dropped outside the drop zone would make the browser open it and
// leave the app, so those drops are ignored.
window.addEventListener('dragover', (event) => event.preventDefault());
window.addEventListener('drop', (event) => event.preventDefault());
