// DOM rendering helpers. Data that comes from a file is only ever inserted
// with textContent or createElement, never innerHTML, so a malicious CSV
// cell like <img onerror=...> is shown as text and never runs.

import { isNumeric } from './csv.js';
import { formatFourDecimals } from './stats.js';

const MAX_ERRORS_SHOWN = 10; // spec §4.2
const PAGE_SIZE = 50; // spec §4.3

/**
 * Replaces the content of a message area with one message.
 * @param {HTMLElement} container - the aria-live message area
 * @param {string} text - message to show (plain text)
 * @param {'info'|'error'} [type='info'] - controls the message style
 * @returns {void}
 */
export function showMessage(container, text, type = 'info') {
  const message = document.createElement('p');
  message.className = `message message-${type}`;
  message.textContent = text;
  container.replaceChildren(message);
}

/**
 * Shows an error title and a list with the first 10 errors, plus the total
 * count when there are more.
 * @param {HTMLElement} container - the aria-live message area
 * @param {string} title - summary line (plain text)
 * @param {string[]} errors - error messages
 * @returns {void}
 */
export function showErrors(container, title, errors) {
  const box = document.createElement('div');
  box.className = 'message message-error';

  const heading = document.createElement('p');
  heading.textContent = title;
  const list = document.createElement('ul');
  for (const error of errors.slice(0, MAX_ERRORS_SHOWN)) {
    const item = document.createElement('li');
    item.textContent = error;
    list.appendChild(item);
  }
  box.append(heading, list);

  if (errors.length > MAX_ERRORS_SHOWN) {
    const more = document.createElement('p');
    more.textContent = `…and ${errors.length - MAX_ERRORS_SHOWN} more (${errors.length} problems in total).`;
    box.appendChild(more);
  }
  container.replaceChildren(box);
}

/**
 * Formats a cell for display: decimal numbers get 4 decimals, integers and
 * text are shown unchanged.
 * @param {string} value - raw cell text
 * @returns {string} text to display
 */
function formatCell(value) {
  if (!isNumeric(value)) return value;
  const number = Number(value);
  return Number.isInteger(number) ? String(number) : formatFourDecimals(number);
}

/**
 * Formats a computed number with 4 decimals; "—" when it is not defined.
 * @param {number} value - number to show
 * @returns {string} text to display
 */
function formatNumber(value) {
  return Number.isFinite(value) ? formatFourDecimals(value) : '—';
}

/**
 * Shows the diagnosis: one block per anomaly found (name, epochs,
 * explanation and hint), or "No anomalies detected", plus a note for each
 * rule that was skipped because the log is too short.
 * @param {HTMLElement} container - element that will hold the diagnosis
 * @param {{findings: {anomaly: string, epochs: number[], explanation: string, hint: string}[], skipped: string[]}} diagnosis - output of diagnose
 * @returns {void}
 */
export function renderDiagnosis(container, diagnosis) {
  const blocks = [];

  if (diagnosis.findings.length === 0) {
    const ok = document.createElement('p');
    ok.className = 'diagnosis-ok';
    // The ✓ / ⚠ symbols mark the result without relying on color alone.
    ok.textContent = '✓ No anomalies detected. The curves show none of the four patterns checked: overfitting, underfitting, divergence and plateau.';
    blocks.push(ok);
  }

  for (const finding of diagnosis.findings) {
    const block = document.createElement('div');
    block.className = 'finding';
    const title = document.createElement('h3');
    const [from, to] = finding.epochs;
    title.textContent = `⚠ ${finding.anomaly} (epochs ${from}–${to})`;
    const explanation = document.createElement('p');
    explanation.textContent = finding.explanation;
    const hint = document.createElement('p');
    hint.className = 'hint';
    hint.textContent = `What to try: ${finding.hint}`;
    block.append(title, explanation, hint);
    blocks.push(block);
  }

  for (const text of diagnosis.skipped) {
    const note = document.createElement('p');
    note.className = 'note';
    note.textContent = text;
    blocks.push(note);
  }
  container.replaceChildren(...blocks);
}

/**
 * Shows the best epoch and the final train/validation gaps as a short list.
 * Accuracy items are left out when the log has no accuracy.
 * @param {HTMLElement} container - element that will hold the list
 * @param {{bestEpoch: number, bestValLoss: number, bestValAcc: (number|null), lossGap: number, accGap: (number|null)}} analysis - output of analyzeLog
 * @returns {void}
 */
export function renderKeyFigures(container, analysis) {
  const items = [
    ['Best epoch (lowest val_loss)', `${analysis.bestEpoch} — val_loss ${formatNumber(analysis.bestValLoss)}`
      + (analysis.bestValAcc === null ? '' : `, val_acc ${formatNumber(analysis.bestValAcc)}`)],
    ['Final loss gap (val_loss − train_loss)', formatNumber(analysis.lossGap)],
  ];
  if (analysis.accGap !== null) {
    items.push(['Final accuracy gap (train_acc − val_acc)', formatNumber(analysis.accGap)]);
  }

  const list = document.createElement('dl');
  list.className = 'key-figures';
  for (const [label, value] of items) {
    const term = document.createElement('dt');
    term.textContent = label;
    const definition = document.createElement('dd');
    definition.textContent = value;
    list.append(term, definition);
  }

  const note = document.createElement('p');
  note.className = 'note';
  note.textContent = 'A positive gap means the model does better on the training data than on the validation data; a large one is a sign of overfitting.';
  container.replaceChildren(list, note);
}

/**
 * Draws the summary statistics as a table with one row per metric column,
 * after a sentence saying which epochs they cover.
 * @param {HTMLElement} container - element that will hold the table
 * @param {{name: string, stats: {count: number, min: number, max: number, mean: number, median: number, std: number}}[]} summaries - output of summarizeColumns
 * @param {number[]} epochs - the epoch column of the log
 * @returns {void}
 */
export function renderSummary(container, summaries, epochs) {
  const range = document.createElement('p');
  const count = epochs.length === 1 ? '1 epoch' : `${epochs.length} epochs`;
  range.textContent = `Computed over epochs ${epochs[0]}–${epochs[epochs.length - 1]} (${count}).`;

  const table = document.createElement('table');
  const headerRow = table.createTHead().insertRow();
  for (const label of ['Column', 'Min', 'Max', 'Mean', 'Median', 'Std (n − 1)']) {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = label;
    headerRow.appendChild(th);
  }

  const body = table.createTBody();
  for (const { name, stats } of summaries) {
    const tr = body.insertRow();
    const nameCell = document.createElement('th');
    nameCell.scope = 'row';
    nameCell.textContent = name;
    tr.appendChild(nameCell);
    for (const value of [stats.min, stats.max, stats.mean, stats.median, stats.std]) {
      tr.insertCell().textContent = formatNumber(value);
    }
  }

  const wrapper = document.createElement('div');
  wrapper.className = 'table-wrap';
  wrapper.appendChild(table);

  const note = document.createElement('p');
  note.className = 'note';
  note.textContent = 'Std is the sample standard deviation: it divides by n − 1, not n.';
  container.replaceChildren(range, wrapper, note);
}

/**
 * Formats a file size in bytes as B, KB or MB.
 * @param {number} bytes - file size
 * @returns {string} for example "4.4 KB"
 */
export function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Compares two cells for sorting: numbers by value, text alphabetically,
 * and numbers before text.
 * @param {string} a - first cell
 * @param {string} b - second cell
 * @returns {number} negative if a goes first, positive if b goes first, 0 if equal
 */
function compareCells(a, b) {
  const aIsNumber = isNumeric(a);
  const bIsNumber = isNumeric(b);
  if (aIsNumber && bIsNumber) return Number(a) - Number(b);
  if (aIsNumber !== bIsNumber) return aIsNumber ? -1 : 1;
  return a.localeCompare(b, undefined, { numeric: true });
}

/**
 * Returns a sorted copy of the rows; the original array is not changed.
 * The sort is stable, so equal values keep their original order.
 * @param {string[][]} rows - data rows
 * @param {number} col - index of the column to sort by
 * @param {boolean} ascending - true for A→Z / small→large
 * @returns {string[][]} sorted copy
 */
function sortRows(rows, col, ascending) {
  const sign = ascending ? 1 : -1;
  return [...rows].sort((a, b) => sign * compareCells(a[col], b[col]));
}

/**
 * Creates a button with a text label and a click handler.
 * @param {string} label - button text
 * @param {Function} onClick - click handler
 * @returns {HTMLButtonElement}
 */
function makeButton(label, onClick) {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = label;
  button.addEventListener('click', onClick);
  return button;
}

/**
 * Draws the data as an HTML table inside the container, replacing its content.
 * Shows 50 rows per page with Previous/Next controls, and sorts by a column
 * when its header is clicked (a second click reverses the order).
 * The page and sort order are kept inside this table; loading a new file
 * creates a new table that starts on page 1, unsorted.
 * @param {HTMLElement} container - element that will hold the table
 * @param {string[]} headers - column names
 * @param {string[][]} rows - data rows (cells as strings)
 * @returns {void}
 */
export function renderTable(container, headers, rows) {
  const view = { rows, page: 0, sortColumn: null, ascending: true };
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));

  const table = document.createElement('table');
  const headerRow = table.createTHead().insertRow();
  const headerCells = headers.map((name, col) => {
    const th = document.createElement('th');
    th.scope = 'col';
    // A button inside the header makes sorting reachable with the keyboard.
    const button = makeButton(name, () => sortBy(col));
    button.className = 'sort-button';
    th.appendChild(button);
    headerRow.appendChild(th);
    return th;
  });
  const body = table.createTBody();

  const pager = document.createElement('div');
  pager.className = 'pager';
  pager.hidden = rows.length <= PAGE_SIZE;
  const previous = makeButton('Previous', () => goToPage(view.page - 1, next));
  const status = document.createElement('span');
  const next = makeButton('Next', () => goToPage(view.page + 1, previous));
  pager.append(previous, status, next);

  /** Sorts by a column (or reverses the order) and goes back to page 1. */
  function sortBy(col) {
    view.ascending = view.sortColumn === col ? !view.ascending : true;
    view.sortColumn = col;
    view.rows = sortRows(rows, col, view.ascending);
    view.page = 0;
    update();
  }

  /**
   * Shows another page. On the first or last page the clicked button gets
   * disabled, so focus moves to the other button instead of being lost.
   */
  function goToPage(page, otherButton) {
    view.page = page;
    update();
    if (document.activeElement.disabled || document.activeElement === document.body) {
      otherButton.focus();
    }
  }

  /** Redraws the rows of the current page, the sort marks and the pager. */
  function update() {
    const start = view.page * PAGE_SIZE;
    const pageRows = view.rows.slice(start, start + PAGE_SIZE);
    body.replaceChildren();
    for (const row of pageRows) {
      const tr = body.insertRow();
      for (const cell of row) {
        tr.insertCell().textContent = formatCell(cell);
      }
    }

    headerCells.forEach((th, col) => {
      if (col === view.sortColumn) {
        th.setAttribute('aria-sort', view.ascending ? 'ascending' : 'descending');
      } else {
        th.removeAttribute('aria-sort');
      }
    });

    previous.disabled = view.page === 0;
    next.disabled = view.page >= pageCount - 1;
    status.textContent = `Rows ${start + 1}–${start + pageRows.length} of ${rows.length} · page ${view.page + 1} of ${pageCount}`;
  }

  update();

  // The wrapper scrolls sideways on narrow screens instead of the whole page.
  const wrapper = document.createElement('div');
  wrapper.className = 'table-wrap';
  wrapper.appendChild(table);
  container.replaceChildren(wrapper, pager);
}
