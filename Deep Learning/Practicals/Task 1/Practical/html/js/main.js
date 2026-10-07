// Entry point: connects the page to the logic modules.
// It holds the application state and registers the event listeners.

import { parseCsv, checkFile, checkRowLimit, validateTrainingLog } from './csv.js';
import { summarizeColumns } from './stats.js';
import { showMessage, showErrors, renderTable, renderSummary, formatSize } from './ui.js';

// All application state lives in this one object.
const state = {
  // { fileName, fileSize, headers, rows, columns, hasAccuracy }
  // headers/rows: the cells as text (for the table);
  // columns: the numbers of each log column (for statistics, charts and diagnosis).
  log: null,
};

const fileInput = document.getElementById('file-input');
const dropZone = document.getElementById('drop-zone');
const messages = document.getElementById('messages');
const tableContainer = document.getElementById('data-table');
const summaryContainer = document.getElementById('summary');

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

  state.log = { fileName: file.name, fileSize: file.size, ...result.data };
  renderTable(tableContainer, state.log.headers, state.log.rows);
  renderSummary(summaryContainer, summarizeColumns(state.log.columns));
  const loaded = `${file.name} (${formatSize(file.size)}) — ${state.log.rows.length} rows loaded.`;
  showMessage(messages, [loaded, ...result.notices].join(' '));
}

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
