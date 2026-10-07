// Unit tests for the pure modules (csv.js and stats.js), run by tests.html.
// A tiny test runner, no library: each test is a function that throws when
// something is wrong.

import {
  parseCsv, checkFile, checkRowLimit, validateTrainingLog, isNumeric, MAX_FILE_BYTES, MAX_ROWS,
} from './csv.js';
import {
  describe, summarizeColumns, analyzeLog, diagnose, formatFourDecimals,
} from './stats.js';

// ---------------------------------------------------------------------------
// Test runner
// ---------------------------------------------------------------------------

const results = [];

/**
 * Runs one test and records whether it passed.
 * @param {string} name - what the test checks
 * @param {Function} fn - test body; may be async; throws on failure
 * @returns {Promise<void>}
 */
async function test(name, fn) {
  try {
    await fn();
    results.push({ name, ok: true });
  } catch (error) {
    results.push({ name, ok: false, message: error.message });
  }
}

/**
 * Fails unless both values have the same JSON form (works for numbers,
 * strings, arrays and plain objects).
 * @param {*} actual - value produced by the code
 * @param {*} expected - value the test expects
 * @returns {void}
 */
function assertEqual(actual, expected) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) throw new Error(`expected ${e}, got ${a}`);
}

/**
 * Fails unless two numbers differ by less than a tolerance.
 * @param {number} actual - value produced by the code
 * @param {number} expected - value the test expects
 * @param {number} [tolerance=1e-9] - allowed difference
 * @returns {void}
 */
function assertClose(actual, expected, tolerance = 1e-9) {
  if (!(Math.abs(actual - expected) < tolerance)) throw new Error(`expected ${expected} ± ${tolerance}, got ${actual}`);
}

/**
 * Shows the results on the page.
 * @returns {void}
 */
function showResults() {
  const list = document.getElementById('test-results');
  for (const { name, ok, message } of results) {
    const item = document.createElement('li');
    item.className = ok ? 'test-pass' : 'test-fail';
    item.textContent = ok ? `✓ ${name}` : `✗ ${name} — ${message}`;
    list.appendChild(item);
  }
  const failed = results.filter((result) => !result.ok).length;
  const summary = document.getElementById('test-summary');
  summary.textContent = failed === 0
    ? `All ${results.length} tests passed.`
    : `${failed} of ${results.length} tests FAILED.`;
  summary.className = failed === 0 ? 'test-pass' : 'test-fail';
}

// ---------------------------------------------------------------------------
// Helpers to build test logs
// ---------------------------------------------------------------------------

const HEADER = 'epoch,train_loss,val_loss,train_acc,val_acc';

/**
 * Builds a valid training log as CSV text, with losses that fall smoothly.
 * @param {number} epochs - number of epochs
 * @returns {string} CSV text
 */
function validLogText(epochs) {
  const lines = [HEADER];
  for (let e = 1; e <= epochs; e += 1) {
    lines.push(`${e},${(2 / e).toFixed(4)},${(2.2 / e).toFixed(4)},${(0.5 + e / 100).toFixed(4)},${(0.45 + e / 100).toFixed(4)}`);
  }
  return lines.join('\n');
}

/**
 * Validates CSV text and returns the error list.
 * @param {string} text - CSV text
 * @returns {string[]} validation errors
 */
function errorsOf(text) {
  return validateTrainingLog(parseCsv(text)).errors;
}

/**
 * Builds the columns of a log from loss arrays (epochs start at 1).
 * @param {number[]} trainLoss - train_loss per epoch
 * @param {number[]} valLoss - val_loss per epoch
 * @returns {{epoch: number[], train_loss: number[], val_loss: number[]}}
 */
function columnsOf(trainLoss, valLoss) {
  return { epoch: trainLoss.map((_, i) => i + 1), train_loss: trainLoss, val_loss: valLoss };
}

/**
 * Returns the names of the anomalies found in a log.
 * @param {Object<string, number[]>} columns - numbers per column
 * @param {boolean} [hasAccuracy=false] - whether accuracy columns are present
 * @returns {string[]} anomaly names
 */
function anomaliesOf(columns, hasAccuracy = false) {
  return diagnose(columns, hasAccuracy).findings.map((finding) => finding.anomaly);
}

// ---------------------------------------------------------------------------
// csv.js
// ---------------------------------------------------------------------------

await test('parseCsv splits header and rows', () => {
  assertEqual(parseCsv('a,b\n1,2\n3,4'), { headers: ['a', 'b'], rows: [['1', '2'], ['3', '4']] });
});
await test('parseCsv removes a BOM, accepts \\r\\n and trims cells', () => {
  assertEqual(parseCsv('﻿ a , b \r\n 1 ,2\r\n'), { headers: ['a', 'b'], rows: [['1', '2']] });
});
await test('parseCsv ignores trailing empty lines but keeps empty lines in the middle', () => {
  assertEqual(parseCsv('a\n1\n\n2\n\n  \n').rows, [['1'], [''], ['2']]);
});
await test('parseCsv of an empty text gives no header and no rows', () => {
  assertEqual(parseCsv(''), { headers: [], rows: [] });
});
await test('isNumeric accepts plain decimals and rejects the rest', () => {
  assertEqual(['3', '-0.5', '.5', '1e-3', '0x1A', 'nan', 'Infinity', '', '1,5'].map(isNumeric),
    [true, true, true, true, false, false, false, false, false]);
});
await test('checkFile accepts .csv in any case, up to 50 MB', () => {
  assertEqual([checkFile('log.csv', 100), checkFile('LOG.CSV', MAX_FILE_BYTES)], [[], []]);
});
await test('checkFile rejects other extensions', () => {
  assertEqual(checkFile('log.txt', 100).length, 1);
});
await test('checkFile rejects files over 50 MB', () => {
  assertEqual(checkFile('big.csv', 60 * 1024 * 1024), ['The file is 60.0 MB, but the maximum size is 50 MB. Remove some rows or columns and try again.']);
  assertEqual(checkFile('big.csv', MAX_FILE_BYTES + 1).length, 1);
});
await test('checkRowLimit accepts header + 100 000 rows', () => {
  assertEqual(checkRowLimit(`h\n${'1\n'.repeat(MAX_ROWS)}`), []);
});
await test('checkRowLimit rejects more than 100 000 rows', () => {
  assertEqual(checkRowLimit(`h\n${'1\n'.repeat(MAX_ROWS + 1)}`).length, 1);
});

await test('validateTrainingLog accepts a valid log and converts the numbers', () => {
  const result = validateTrainingLog(parseCsv(validLogText(3)));
  assertEqual([result.ok, result.data.hasAccuracy, result.data.columns.epoch, result.data.columns.train_loss[1]],
    [true, true, [1, 2, 3], 1]);
});
await test('validateTrainingLog accepts a log without accuracy columns', () => {
  const result = validateTrainingLog(parseCsv('epoch,train_loss,val_loss\n1,1,1\n2,0.5,0.6'));
  assertEqual([result.ok, result.data.hasAccuracy, Object.keys(result.data.columns)], [true, false, ['epoch', 'train_loss', 'val_loss']]);
});
await test('validateTrainingLog ignores column order and case', () => {
  const result = validateTrainingLog(parseCsv('VAL_LOSS,Epoch,train_loss\n0.9,1,0.8\n0.7,2,0.6'));
  assertEqual([result.ok, result.data.columns.val_loss], [true, [0.9, 0.7]]);
});
await test('validateTrainingLog gives a notice for extra columns', () => {
  const result = validateTrainingLog(parseCsv('epoch,train_loss,val_loss,lr\n1,1,1,0.01\n2,0.5,0.6,0.01'));
  assertEqual([result.ok, result.notices], [true, ['Ignored a column that a training log does not use: "lr".']]);
});
await test('error: empty file', () => {
  assertEqual(errorsOf(''), ['The file is empty. Choose a CSV file with a header row and one row per epoch.']);
});
await test('error: no header row', () => {
  assertEqual(errorsOf('1,2,3\n2,1,1')[0].startsWith('Row 1 contains only numbers'), true);
});
await test('error: missing required column', () => {
  assertEqual(errorsOf('epoch,train_loss\n1,1\n2,0.5')[0].startsWith('The column "val_loss" is missing.'), true);
});
await test('error: only one accuracy column', () => {
  assertEqual(errorsOf('epoch,train_loss,val_loss,val_acc\n1,1,1,0.5\n2,0.5,0.6,0.6'),
    ['Only "val_acc" was found. The accuracy columns must appear together: add "train_acc" or remove "val_acc".']);
});
await test('error: duplicated column name (case-insensitive)', () => {
  assertEqual(errorsOf('epoch,train_loss,val_loss,Epoch\n1,1,1,1\n2,0.5,0.6,2')[0].startsWith('Row 1: the column name "Epoch" is used twice (columns 1 and 4).'), true);
});
await test('error: column without a name', () => {
  assertEqual(errorsOf('epoch,train_loss,val_loss,\n1,1,1,x\n2,0.5,0.6,y')[0].startsWith('Row 1, column 4: the column has no name.'), true);
});
await test('error: wrong number of cells, with no follow-on error', () => {
  assertEqual(errorsOf('epoch,train_loss,val_loss\n1,1,1\n2,0.5\n3,0.4,0.5'),
    ['Row 3 has 2 cells, but the header has 3 columns. Check that row for missing or extra commas.']);
});
await test('error: empty line in the middle', () => {
  assertEqual(errorsOf('epoch,train_loss,val_loss\n1,1,1\n\n2,0.5,0.6'), ['Row 3 is empty. Delete the empty line.']);
});
await test('error: missing value', () => {
  assertEqual(errorsOf('epoch,train_loss,val_loss\n1,1,1\n2,,0.6'), ['Row 3, column "train_loss": the value is missing. Fill in the missing value.']);
});
await test('error: non-numeric value', () => {
  assertEqual(errorsOf('epoch,train_loss,val_loss\n1,1,1\n2,abc,0.6')[0].startsWith('Row 3, column "train_loss": value "abc" is not a number.'), true);
});
await test('error: NaN loss explains divergence', () => {
  assertEqual(errorsOf('epoch,train_loss,val_loss\n1,1,1\n2,nan,0.6')[0].includes('usually mean the training diverged'), true);
});
await test('error: accuracy out of range (spec example)', () => {
  // 13 valid epochs, then epoch 14 with val_acc 1.3: that is row 15 of the file.
  const text = `${validLogText(13)}\n14,0.1,0.1,0.9,1.3`;
  assertEqual(errorsOf(text), ['Row 15, column "val_acc": value "1.3" is out of range. Accuracy must be between 0 and 1.']);
});
await test('error: negative loss', () => {
  assertEqual(errorsOf('epoch,train_loss,val_loss\n1,1,1\n2,0.5,-0.2'), ['Row 3, column "val_loss": value "-0.2" is out of range. Loss values cannot be negative.']);
});
await test('error: epoch that is not a whole number, with no follow-on error', () => {
  assertEqual(errorsOf('epoch,train_loss,val_loss\n1,1,1\n2.5,0.5,0.6\n3,0.4,0.5'),
    ['Row 3, column "epoch": value "2.5" is not a valid epoch. Epochs must be whole numbers starting from 1.']);
});
await test('error: repeated epoch, with no follow-on error', () => {
  assertEqual(errorsOf('epoch,train_loss,val_loss\n1,1,1\n2,0.5,0.6\n2,0.4,0.5\n4,0.3,0.4').length, 1);
});
await test('error: gap in the epochs', () => {
  assertEqual(errorsOf('epoch,train_loss,val_loss\n1,1,1\n2,0.5,0.6\n4,0.4,0.5'),
    ['Row 4, column "epoch": the log jumps from epoch 2 to epoch 4. Epochs must have no gaps; add the missing epochs.']);
});
await test('error: fewer than 2 epochs', () => {
  assertEqual(errorsOf('epoch,train_loss,val_loss\n1,1,1'), ['The log has 1 epoch, but at least 2 are needed to draw curves. Add more epochs.']);
});

// ---------------------------------------------------------------------------
// stats.js
// ---------------------------------------------------------------------------

await test('formatFourDecimals rounds ties half up, even when binary stores them below', () => {
  // 0.00015 is stored as 0.000149999…, so (0.00015).toFixed(4) gives "0.0001".
  assertEqual([0.00015, 0.00035, 1.00005, 0.80825, 0.99995].map(formatFourDecimals), ['0.0002', '0.0004', '1.0001', '0.8083', '1.0000']);
});
await test('formatFourDecimals removes floating-point noise first (12 significant digits)', () => {
  // The mean of the sample's val_acc is exactly 0.80825 but is computed as 0.8082499999999999.
  assertEqual(formatFourDecimals(0.8082499999999999), '0.8083');
});
await test('formatFourDecimals rounds negative ties away from zero, and never shows -0.0000', () => {
  assertEqual([-0.80825, -0.00015, -0.00004, 0, 2.125].map(formatFourDecimals), ['-0.8083', '-0.0002', '0.0000', '0.0000', '2.1250']);
});
await test('describe: count, min, max, mean, median of an odd list', () => {
  const s = describe([3, 1, 2]);
  assertEqual([s.count, s.min, s.max, s.mean, s.median], [3, 1, 3, 2, 2]);
});
await test('describe: median of an even list is the mean of the two middle values', () => {
  assertEqual(describe([4, 1, 3, 2]).median, 2.5);
});
await test('describe: std is the sample std (divides by n − 1)', () => {
  // Values with mean 5 and sum of squared deviations 32: sample std = √(32 / 7).
  assertClose(describe([2, 4, 4, 4, 5, 5, 7, 9]).std, Math.sqrt(32 / 7));
});
await test('describe: std of a single value is NaN (not defined)', () => {
  assertEqual(Number.isNaN(describe([5]).std), true);
});
await test('describe does not change the order of its input', () => {
  const values = [3, 1, 2];
  describe(values);
  assertEqual(values, [3, 1, 2]);
});
await test('describe works on 100 000 values', () => {
  assertEqual(describe(Array.from({ length: 100000 }, (_, i) => i)).max, 99999);
});
await test('summarizeColumns describes every metric column, in order, and skips epoch', () => {
  assertEqual(summarizeColumns({ epoch: [1, 2], train_loss: [1, 0.5], val_loss: [1.2, 0.8] }).map((s) => [s.name, s.stats.mean]),
    [['train_loss', 0.75], ['val_loss', 1]]);
});

await test('analyzeLog: best epoch is the first lowest val_loss', () => {
  const columns = {
    epoch: [1, 2, 3, 4], train_loss: [1, 0.8, 0.6, 0.5], val_loss: [1, 0.7, 0.7, 0.9], train_acc: [0.5, 0.6, 0.7, 0.9], val_acc: [0.5, 0.6, 0.65, 0.7],
  };
  const result = analyzeLog(columns, true);
  assertEqual([result.bestEpoch, result.bestValLoss, result.bestValAcc], [2, 0.7, 0.6]);
  assertClose(result.lossGap, 0.4);
  assertClose(result.accGap, 0.2);
});
await test('analyzeLog: accuracy values are null without accuracy', () => {
  const result = analyzeLog(columnsOf([1, 0.5], [1.1, 0.6]), false);
  assertEqual([result.bestValAcc, result.accGap], [null, null]);
});
await test('analyzeLog reports the real epoch number, not a position', () => {
  assertEqual(analyzeLog({ epoch: [11, 12, 13], train_loss: [1, 1, 1], val_loss: [3, 1, 2] }, false).bestEpoch, 12);
});

// Diagnosis: one small log per rule, built to trigger exactly that rule.
const falling = (n, from, to) => Array.from({ length: n }, (_, i) => from + ((to - from) * i) / (n - 1));

await test('diagnose: a healthy log has no anomalies', () => {
  assertEqual(anomaliesOf(columnsOf(falling(20, 2, 0.2), falling(20, 2.1, 0.3))), []);
});
await test('diagnose: overfitting when val_loss rises ≥ 10 % after its minimum and train_loss keeps falling', () => {
  const valLoss = [...falling(10, 2, 0.5), 0.52, 0.55, 0.58, 0.6, 0.62];
  assertEqual(anomaliesOf(columnsOf(falling(15, 2, 0.1), valLoss)), ['Overfitting']);
});
await test('diagnose: no overfitting when val_loss rises less than 10 %', () => {
  const valLoss = [...falling(10, 2, 0.5), 0.51, 0.52, 0.53, 0.53, 0.54];
  assertEqual(anomaliesOf(columnsOf(falling(15, 2, 0.1), valLoss)).includes('Overfitting'), false);
});
await test('diagnose: no overfitting when the minimum is in the last 5 epochs', () => {
  const valLoss = [...falling(12, 2, 0.5), 0.6, 0.7, 0.8];
  assertEqual(anomaliesOf(columnsOf(falling(15, 2, 0.1), valLoss)).includes('Overfitting'), false);
});
await test('diagnose: underfitting when train_loss stays above 50 % of its start', () => {
  assertEqual(anomaliesOf(columnsOf(falling(15, 2, 1.4), falling(15, 2.1, 1.5))), ['Underfitting']);
});
await test('diagnose: underfitting when the final train_acc is below 0.6', () => {
  const columns = { ...columnsOf([1, 0.2], [1, 0.3]), train_acc: [0.3, 0.5], val_acc: [0.3, 0.45] };
  assertEqual(diagnose(columns, true).findings.map((f) => f.explanation), ['The final train_acc is only 0.5000.']);
});
await test('diagnose: divergence when train_loss rises 5 epochs in a row', () => {
  const trainLoss = [1, 0.8, 0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 0.5];
  assertEqual(anomaliesOf(columnsOf(trainLoss, trainLoss)), ['Divergence']);
});
await test('diagnose: divergence (not underfitting) when train_loss ends above its start', () => {
  assertEqual(anomaliesOf(columnsOf([1, 0.9, 1.2], [1, 0.9, 1.2])), ['Divergence']);
});
await test('diagnose: plateau when val_loss changes less than 1 % over the last 10 epochs', () => {
  const valLoss = [...falling(10, 2, 0.5), 0.5, 0.499, 0.501, 0.5, 0.498, 0.499, 0.5, 0.499, 0.498, 0.497];
  assertEqual(anomaliesOf(columnsOf(falling(20, 2, 0.3), valLoss)), ['Plateau']);
});
await test('diagnose: rules that need more epochs are skipped with a note', () => {
  const result = diagnose(columnsOf(falling(5, 2, 0.2), falling(5, 2.1, 0.3)), false);
  assertEqual(result.skipped, [
    'Overfitting was not checked: it needs at least 6 epochs and the log has 5.',
    'Plateau was not checked: it needs at least 11 epochs and the log has 5.',
  ]);
});
await test('diagnose: all-zero losses do not crash and find nothing', () => {
  assertEqual(anomaliesOf(columnsOf(Array(11).fill(0), Array(11).fill(0))), []);
});

// Diagnosis of the files shipped with the app (they are fetched, so these
// tests need the page to be served, like the app itself).
const expectedDiagnoses = {
  'data/training_log.csv': ['Overfitting'],
  'data/examples/healthy.csv': [],
  'data/examples/overfitting.csv': ['Overfitting'],
  'data/examples/underfitting.csv': ['Underfitting'],
  'data/examples/divergence.csv': ['Divergence'],
  'data/examples/plateau.csv': ['Plateau'],
};
for (const [url, expected] of Object.entries(expectedDiagnoses)) {
  await test(`diagnose ${url} → ${expected.length ? expected.join(', ') : 'no anomalies'}`, async () => {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`could not fetch ${url} (HTTP ${response.status})`);
    const result = validateTrainingLog(parseCsv(await response.text()));
    if (!result.ok) throw new Error(`the file is not valid: ${result.errors[0]}`);
    assertEqual(anomaliesOf(result.data.columns, result.data.hasAccuracy), expected);
  });
}
await test('analyzeLog of data/training_log.csv: best epoch 26, gaps 0.6319 and 0.1284', async () => {
  const result = validateTrainingLog(parseCsv(await (await fetch('data/training_log.csv')).text()));
  const analysis = analyzeLog(result.data.columns, true);
  assertEqual([analysis.bestEpoch, analysis.lossGap.toFixed(4), analysis.accGap.toFixed(4)], [26, '0.6319', '0.1284']);
});

showResults();
