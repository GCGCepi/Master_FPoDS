// CSV parsing and validation. Pure functions: no DOM access, so they can be
// unit tested.

const MAX_FILE_MB = 50; // spec §3.2
export const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024;
export const MAX_ROWS = 100000;
const MIN_EPOCHS = 2; // spec §3.1
const REQUIRED_COLUMNS = ['epoch', 'train_loss', 'val_loss'];
const ACCURACY_COLUMNS = ['train_acc', 'val_acc']; // optional, but both or none

// A plain decimal number: "3", "-0.5", ".5", "1e-3". Rejects "0x1A", "Infinity", "".
const NUMBER_PATTERN = /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/;

/**
 * Tells whether a cell holds a plain decimal number.
 * @param {string} value - cell text
 * @returns {boolean} true if the text is a number
 */
export function isNumeric(value) {
  return NUMBER_PATTERN.test(value);
}

/**
 * Checks the file type and size before the file is read, so a huge file
 * never freezes the page.
 * @param {string} name - file name
 * @param {number} size - file size in bytes
 * @returns {string[]} error messages (empty if the file is acceptable)
 */
export function checkFile(name, size) {
  const errors = [];
  if (!name.toLowerCase().endsWith('.csv')) {
    errors.push(`"${name}" is not a CSV file. Choose a file with the .csv extension (in a spreadsheet program, use "Save as" → CSV).`);
  }
  if (size > MAX_FILE_BYTES) {
    const megabytes = (size / (1024 * 1024)).toFixed(1);
    errors.push(`The file is ${megabytes} MB, but the maximum size is ${MAX_FILE_MB} MB. Remove some rows or columns and try again.`);
  }
  return errors;
}

/**
 * Counts the lines of the text without splitting it, and stops as soon as
 * there are too many. Runs before parseCsv so a huge file is rejected cheaply.
 * @param {string} text - raw content of the file
 * @returns {string[]} error messages (empty if the row count is acceptable)
 */
export function checkRowLimit(text) {
  let newlines = 0;
  for (let i = text.indexOf('\n'); i !== -1; i = text.indexOf('\n', i + 1)) {
    newlines += 1;
    // Header + MAX_ROWS rows + one trailing newline is still acceptable.
    if (newlines > MAX_ROWS + 1) {
      return [`The file has more than ${MAX_ROWS} data rows. Keep at most ${MAX_ROWS} rows and try again.`];
    }
  }
  return [];
}

/**
 * Splits CSV text into a header row and data rows.
 * Removes a UTF-8 BOM, accepts "\n" and "\r\n" line endings, trims every
 * cell and ignores empty lines at the end of the file.
 * Cells are kept as strings; checking and converting them is validation's job.
 * @param {string} text - raw content of the file
 * @returns {{headers: string[], rows: string[][]}} header names and data rows
 */
export function parseCsv(text) {
  const withoutBom = text.startsWith('﻿') ? text.slice(1) : text;
  const lines = withoutBom.split(/\r?\n/);

  // Only trailing empty lines are dropped. An empty line in the middle stays,
  // so validation can report it as a row with the wrong number of cells.
  while (lines.length > 0 && lines[lines.length - 1].trim() === '') {
    lines.pop();
  }
  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  const splitLine = (line) => line.split(',').map((cell) => cell.trim());
  return {
    headers: splitLine(lines[0]),
    rows: lines.slice(1).map(splitLine),
  };
}


/**
 * Checks the header row of a training log: names present, unique, required
 * columns there, and accuracy columns both present or both absent.
 * @param {string[]} headers - column names from the file
 * @returns {{errors: string[], notices: string[], index: Map<string, number>, hasAccuracy: boolean}}
 *   index maps each lower-case column name to its position in the file
 */
function checkHeader(headers) {
  const errors = [];
  const notices = [];
  const index = new Map();

  if (headers.every(isNumeric)) {
    errors.push(`Row 1 contains only numbers, so the file seems to have no header. Add a first row with the column names: ${[...REQUIRED_COLUMNS, ...ACCURACY_COLUMNS].join(',')}.`);
    return { errors, notices, index, hasAccuracy: false };
  }

  headers.forEach((name, col) => {
    const key = name.toLowerCase();
    if (name === '') {
      errors.push(`Row 1, column ${col + 1}: the column has no name. Give every column a name in the header row.`);
    } else if (index.has(key)) {
      errors.push(`Row 1: the column name "${name}" is used twice (columns ${index.get(key) + 1} and ${col + 1}). Column names must be unique; upper and lower case count as the same name.`);
    } else {
      index.set(key, col);
    }
  });

  for (const name of REQUIRED_COLUMNS) {
    if (!index.has(name)) {
      errors.push(`The column "${name}" is missing. A training log needs the columns ${REQUIRED_COLUMNS.join(', ')} (and optionally ${ACCURACY_COLUMNS.join(' and ')}).`);
    }
  }

  const accuracyFound = ACCURACY_COLUMNS.filter((name) => index.has(name));
  if (accuracyFound.length === 1) {
    const found = accuracyFound[0];
    const missing = ACCURACY_COLUMNS.find((name) => name !== found);
    errors.push(`Only "${found}" was found. The accuracy columns must appear together: add "${missing}" or remove "${found}".`);
  }

  const known = [...REQUIRED_COLUMNS, ...ACCURACY_COLUMNS];
  const extra = headers.filter((name) => name !== '' && !known.includes(name.toLowerCase()));
  if (extra.length > 0) {
    const list = extra.map((name) => `"${name}"`).join(', ');
    notices.push(`Ignored ${extra.length === 1 ? 'a column' : 'columns'} that a training log does not use: ${list}.`);
  }

  return { errors, notices, index, hasAccuracy: accuracyFound.length === 2 };
}

/**
 * Checks that a number is in the allowed range for its column (spec §3.1).
 * @param {string} name - lower-case column name
 * @param {number} number - the value
 * @returns {string|null} the end of an error sentence, or null if the value is fine
 */
function rangeProblem(name, number) {
  if (name === 'epoch') {
    return Number.isInteger(number) && number >= 1 ? null : 'is not a valid epoch. Epochs must be whole numbers starting from 1.';
  }
  if (name.endsWith('_loss')) {
    return number >= 0 ? null : 'is out of range. Loss values cannot be negative.';
  }
  return number >= 0 && number <= 1 ? null : 'is out of range. Accuracy must be between 0 and 1.';
}

/**
 * Checks a parsed training log against spec §3.1 and §4.2. Every error says
 * what is wrong, where (row numbers count the header as row 1) and how to fix it.
 * @param {{headers: string[], rows: string[][]}} parsed - output of parseCsv
 * @returns {{ok: boolean, data: ({headers: string[], rows: string[][], columns: Object<string, number[]>, hasAccuracy: boolean}|null), errors: string[], notices: string[]}}
 *   columns holds the numbers of each log column (epoch, train_loss, ...), keyed by lower-case name
 */
export function validateTrainingLog(parsed) {
  const { headers, rows } = parsed;
  if (headers.length === 0) {
    return { ok: false, data: null, errors: ['The file is empty. Choose a CSV file with a header row and one row per epoch.'], notices: [] };
  }

  // Cells can only be checked once the header is right, so header errors stop here.
  const header = checkHeader(headers);
  if (header.errors.length > 0) {
    return { ok: false, data: null, errors: header.errors, notices: [] };
  }

  const errors = [];
  if (rows.length < MIN_EPOCHS) {
    errors.push(`The log has ${rows.length} ${rows.length === 1 ? 'epoch' : 'epochs'}, but at least ${MIN_EPOCHS} are needed to draw curves. Add more epochs.`);
  }
  if (rows.length > MAX_ROWS) {
    errors.push(`The file has ${rows.length} data rows. Keep at most ${MAX_ROWS} rows and try again.`);
  }

  const used = header.hasAccuracy ? [...REQUIRED_COLUMNS, ...ACCURACY_COLUMNS] : REQUIRED_COLUMNS;
  const columns = Object.fromEntries(used.map((name) => [name, []]));
  let previousEpoch = null;

  rows.forEach((row, r) => {
    const rowNumber = r + 2; // the header is row 1
    if (row.length === 1 && row[0] === '') {
      errors.push(`Row ${rowNumber} is empty. Delete the empty line.`);
      previousEpoch = null;
      return;
    }
    if (row.length !== headers.length) {
      errors.push(`Row ${rowNumber} has ${row.length} cells, but the header has ${headers.length} columns. Check that row for missing or extra commas.`);
      previousEpoch = null;
      return;
    }

    for (const name of used) {
      const col = header.index.get(name);
      const cell = row[col];
      const where = `Row ${rowNumber}, column "${headers[col]}"`;
      // After a broken row the epoch sequence cannot be judged, so the next
      // row is not compared with it (this avoids a second, misleading error).
      if (name === 'epoch') {
        const epochOk = isNumeric(cell) && rangeProblem('epoch', Number(cell)) === null;
        if (!epochOk) previousEpoch = null;
      }
      if (cell === '') {
        errors.push(`${where}: the value is missing. Fill in the missing value.`);
        continue;
      }
      if (!isNumeric(cell)) {
        // NaN or infinite losses are a common sign of a diverged training run.
        const hint = /^[+-]?(nan|inf|infinity)$/i.test(cell)
          ? 'NaN or infinite values usually mean the training diverged; remove those epochs to see the curves up to that point.'
          : 'Use digits with a dot as the decimal separator, for example 0.25.';
        errors.push(`${where}: value "${cell}" is not a number. ${hint}`);
        continue;
      }
      const number = Number(cell);
      const problem = rangeProblem(name, number);
      if (problem) {
        errors.push(`${where}: value "${cell}" ${problem}`);
        continue;
      }
      columns[name].push(number);

      if (name === 'epoch') {
        if (previousEpoch !== null && number <= previousEpoch) {
          errors.push(`${where}: epoch ${number} comes after epoch ${previousEpoch}. Epochs must be strictly increasing; sort the rows by epoch and remove repeated epochs.`);
          previousEpoch = null;
        } else {
          if (previousEpoch !== null && number > previousEpoch + 1) {
            errors.push(`${where}: the log jumps from epoch ${previousEpoch} to epoch ${number}. Epochs must have no gaps; add the missing epochs.`);
          }
          previousEpoch = number;
        }
      }
    }
  });

  const ok = errors.length === 0;
  return {
    ok,
    data: ok ? { headers, rows, columns, hasAccuracy: header.hasAccuracy } : null,
    errors,
    notices: header.notices,
  };
}
