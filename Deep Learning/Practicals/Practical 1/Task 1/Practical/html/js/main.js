// Entry point: connects the page to the logic modules.
// It holds the application state and registers the event listeners.

import { parseCsv, checkFile, checkRowLimit, validateTrainingLog } from './csv.js';
import { summarizeColumns, analyzeLog, diagnose } from './stats.js';
import {
  showMessage, showErrors, renderTable, renderSummary, renderKeyFigures, renderDiagnosis, formatSize,
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
const diagnosisContainer = document.getElementById('diagnosis');
const chartsPlaceholder = document.getElementById('charts-placeholder');
const chartsContainer = document.getElementById('charts');
const logScaleToggle = document.getElementById('log-scale');
const themeToggle = document.getElementById('theme-toggle');

const THEME_KEY = 'theme'; // localStorage key for the theme chosen with the button
const systemDark = window.matchMedia('(prefers-color-scheme: dark)');

/**
 * Tells which theme is showing: the one chosen with the button, or else
 * the system's.
 * @returns {'light'|'dark'} the current theme
 */
function currentTheme() {
  const chosen = document.documentElement.dataset.theme;
  if (chosen === 'light' || chosen === 'dark') return chosen;
  return systemDark.matches ? 'dark' : 'light';
}

/**
 * Updates the theme button so it shows the icon of the theme it switches to
 * (moon → dark, sun → light). The button has no visible text, so its label
 * is set for screen readers (aria-label) and as a hover tooltip (title).
 * @returns {void}
 */
function updateThemeButton() {
  const other = currentTheme() === 'dark' ? 'light' : 'dark';
  const label = `Switch to ${other} mode`;
  themeToggle.dataset.icon = other === 'dark' ? 'moon' : 'sun';
  themeToggle.setAttribute('aria-label', label);
  themeToggle.title = label;
}

/**
 * Applies a theme (the CSS reads data-theme on <html>), remembers it and
 * redraws the charts, whose colors come from the CSS variables.
 * @param {'light'|'dark'} theme - theme to show
 * @returns {void}
 */
function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  // Storage can be blocked (private mode, strict settings); the theme still
  // works for this visit, it is just not remembered.
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // nothing to do
  }
  updateThemeButton();
  if (state.log) showCharts();
}

/**
 * Applies the theme remembered from an earlier visit, if any.
 * @returns {void}
 */
function restoreTheme() {
  let saved = null;
  try {
    saved = localStorage.getItem(THEME_KEY);
  } catch {
    // storage blocked: follow the system theme
  }
  if (saved === 'light' || saved === 'dark') {
    document.documentElement.dataset.theme = saved;
  }
  updateThemeButton();
}

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
  renderDiagnosis(diagnosisContainer, diagnose(state.log.columns, state.log.hasAccuracy));
  renderTable(tableContainer, state.log.headers, state.log.rows);
  renderKeyFigures(keyFiguresContainer, analysis);
  renderSummary(summaryContainer, summarizeColumns(state.log.columns), state.log.columns.epoch);
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

themeToggle.addEventListener('click', () => {
  setTheme(currentTheme() === 'dark' ? 'light' : 'dark');
});

// The chart colors come from CSS variables, so the charts are redrawn when
// the system switches between light and dark mode (this only changes what
// is shown if no theme was chosen with the button).
systemDark.addEventListener('change', () => {
  updateThemeButton();
  if (state.log) showCharts();
});

restoreTheme();

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
