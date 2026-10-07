// Statistics. Pure functions: no DOM access, so they can be unit tested.

/**
 * Computes summary statistics of a list of numbers.
 * The standard deviation is the sample one (divides by n − 1), as the spec
 * requires; with fewer than 2 values it is NaN because it is not defined.
 * @param {number[]} values - the numbers (at least one)
 * @returns {{count: number, min: number, max: number, mean: number, median: number, std: number}}
 */
export function describe(values) {
  const count = values.length;

  // A plain loop instead of Math.min(...values): spreading 100 000 values
  // into a function call can exceed the browser's argument limit.
  let min = Infinity;
  let max = -Infinity;
  let sum = 0;
  for (const value of values) {
    if (value < min) min = value;
    if (value > max) max = value;
    sum += value;
  }
  const mean = sum / count;

  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(count / 2);
  const median = count % 2 === 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;

  // Two passes (mean first, then squared deviations) is more accurate than
  // the one-pass formula sum(x²) − n·mean², which can lose precision.
  let squaredDeviations = 0;
  for (const value of values) {
    squaredDeviations += (value - mean) ** 2;
  }
  const std = count > 1 ? Math.sqrt(squaredDeviations / (count - 1)) : NaN;

  return { count, min, max, mean, median, std };
}

/**
 * Describes every metric column of a validated training log. The epoch
 * column is skipped: it is only an index, so its statistics mean nothing.
 * @param {Object<string, number[]>} columns - numbers per column (from validateTrainingLog)
 * @returns {{name: string, stats: ReturnType<typeof describe>}[]} one entry per metric column
 */
export function summarizeColumns(columns) {
  return Object.entries(columns)
    .filter(([name]) => name !== 'epoch')
    .map(([name, values]) => ({ name, stats: describe(values) }));
}

/**
 * Formats a number with 4 decimals, rounding half up (away from zero), as a
 * spreadsheet does: 0.00015 → "0.0002", 0.80825 → "0.8083", -0.80825 → "-0.8083".
 * Two steps:
 * 1. Keep 12 significant digits. This removes floating-point noise, e.g. a
 *    mean of exactly 0.80825 that comes out as 0.8082499999999999.
 * 2. Round that value half up with integers. toFixed() alone cannot do it:
 *    many decimals such as 0.00015 are stored in binary slightly below
 *    their real value (0.000149999…), so toFixed(4) would round them down.
 * @param {number} value - a finite number
 * @returns {string} the value with 4 decimals
 */
export function formatFourDecimals(value) {
  const scaled = Number((Math.abs(value) * 1e4).toPrecision(12)); // 0.80825 → 8082.5
  const rounded = Math.floor(scaled + 0.5); // half up; x.5 is exact in binary
  return ((Math.sign(value) * rounded) / 1e4).toFixed(4);
}

/**
 * Finds the position of the smallest value (the first one if tied).
 * @param {number[]} values - at least one number
 * @returns {number} index of the minimum
 */
function indexOfMin(values) {
  let best = 0;
  for (let i = 1; i < values.length; i += 1) {
    if (values[i] < values[best]) best = i; // strict "<" keeps the first one on ties
  }
  return best;
}

/**
 * Finds the best epoch and the final train/validation gaps of a log (spec §4.4).
 * The best epoch is the one with the lowest val_loss (the first one if tied).
 * Gaps are measured at the last epoch and are positive when the model does
 * better on the training set than on the validation set.
 * @param {Object<string, number[]>} columns - numbers per column (from validateTrainingLog)
 * @param {boolean} hasAccuracy - whether train_acc and val_acc are present
 * @returns {{bestEpoch: number, bestValLoss: number, bestValAcc: (number|null), lossGap: number, accGap: (number|null)}}
 *   accuracy values are null when the log has no accuracy
 */
export function analyzeLog(columns, hasAccuracy) {
  const { epoch, train_loss: trainLoss, val_loss: valLoss } = columns;
  const best = indexOfMin(valLoss);
  const last = epoch.length - 1;
  return {
    bestEpoch: epoch[best],
    bestValLoss: valLoss[best],
    bestValAcc: hasAccuracy ? columns.val_acc[best] : null,
    lossGap: valLoss[last] - trainLoss[last],
    accGap: hasAccuracy ? columns.train_acc[last] - columns.val_acc[last] : null,
  };
}

// ---------------------------------------------------------------------------
// Diagnosis (spec §4.6). Each anomaly is one small function with fixed,
// named thresholds, so every rule can be read, tested and tuned on its own.
// ---------------------------------------------------------------------------

const OVERFIT_MIN_EPOCHS_AFTER_BEST = 5; // the val_loss minimum must be at least this far from the end
const OVERFIT_MIN_RISE = 0.10; // final val_loss at least 10 % above its minimum
const UNDERFIT_MAX_LOSS_RATIO = 0.5; // final train_loss above 50 % of the first one
const UNDERFIT_MIN_ACC = 0.6; // final train_acc below this
const DIVERGENCE_RISES = 5; // consecutive train_loss rises
const PLATEAU_WINDOW = 10; // epochs
const PLATEAU_MAX_CHANGE = 0.01; // val_loss changed by less than 1 % over the window

/**
 * Formats a loss or accuracy value for an explanation sentence, with the
 * same rounding as the rest of the page.
 * @param {number} value - number to show
 * @returns {string} the value with 4 decimals
 */
function fmt(value) {
  return formatFourDecimals(value);
}

/**
 * Formats a ratio as a percentage, for example 0.638 → "64 %".
 * @param {number} ratio - a ratio (0.1 means 10 %)
 * @returns {string} the rounded percentage
 */
function percent(ratio) {
  return `${Math.round(ratio * 100)} %`;
}

/**
 * Overfitting: val_loss reaches its minimum and then rises clearly while
 * train_loss keeps dropping (the model starts memorizing the training set).
 * @param {Object<string, number[]>} columns - numbers per column
 * @returns {{epochs: number[], explanation: string, hint: string}|null} the finding, or null if not found
 */
function checkOverfitting(columns) {
  const { epoch, train_loss: trainLoss, val_loss: valLoss } = columns;
  const best = indexOfMin(valLoss);
  const last = valLoss.length - 1;
  if (last - best < OVERFIT_MIN_EPOCHS_AFTER_BEST) return null;

  const rise = (valLoss[last] - valLoss[best]) / valLoss[best];
  // Written as !(a >= b) so a NaN (0 / 0) also counts as "not found".
  if (!(rise >= OVERFIT_MIN_RISE) || !(trainLoss[last] < trainLoss[best])) return null;

  return {
    epochs: [epoch[best], epoch[last]],
    explanation: `val_loss reached its minimum at epoch ${epoch[best]} (${fmt(valLoss[best])}) and rose ${percent(rise)} by epoch ${epoch[last]} (${fmt(valLoss[last])}), while train_loss kept dropping (${fmt(trainLoss[best])} → ${fmt(trainLoss[last])}).`,
    hint: `The model is memorizing the training data. Keep the weights from epoch ${epoch[best]} (early stopping), or add regularization (dropout, weight decay) or more training data.`,
  };
}

/**
 * Underfitting: the model barely learned the training data.
 * A train_loss that ends above its first value is left to checkDivergence.
 * @param {Object<string, number[]>} columns - numbers per column
 * @param {boolean} hasAccuracy - whether train_acc and val_acc are present
 * @returns {{epochs: number[], explanation: string, hint: string}|null} the finding, or null if not found
 */
function checkUnderfitting(columns, hasAccuracy) {
  const { epoch, train_loss: trainLoss } = columns;
  const last = trainLoss.length - 1;
  const ratio = trainLoss[last] / trainLoss[0];
  const lossStuck = ratio > UNDERFIT_MAX_LOSS_RATIO && ratio <= 1;
  const accuracyLow = hasAccuracy && columns.train_acc[last] < UNDERFIT_MIN_ACC;
  if (!lossStuck && !accuracyLow) return null;

  const reasons = [];
  if (lossStuck) {
    reasons.push(`train_loss only fell from ${fmt(trainLoss[0])} to ${fmt(trainLoss[last])} (${percent(ratio)} of its first value)`);
  }
  if (accuracyLow) {
    // "The" only when it starts the sentence; column names like train_loss are never capitalized.
    reasons.push(`${reasons.length === 0 ? 'The' : 'the'} final train_acc is only ${fmt(columns.train_acc[last])}`);
  }
  return {
    epochs: [epoch[0], epoch[last]],
    explanation: `${reasons.join(', and ')}.`,
    hint: 'The model has not learned the training data well. Train for more epochs, use a bigger model, or raise the learning rate.',
  };
}

/**
 * Divergence: train_loss goes up instead of down, usually because the
 * learning rate is too high.
 * @param {Object<string, number[]>} columns - numbers per column
 * @returns {{epochs: number[], explanation: string, hint: string}|null} the finding, or null if not found
 */
function checkDivergence(columns) {
  const { epoch, train_loss: trainLoss } = columns;
  const last = trainLoss.length - 1;
  const hint = 'The optimizer is overshooting instead of converging. Lower the learning rate (for example by 10×), and check the data for extreme values.';

  let rises = 0;
  for (let i = 1; i <= last; i += 1) {
    rises = trainLoss[i] > trainLoss[i - 1] ? rises + 1 : 0;
    if (rises === DIVERGENCE_RISES) {
      const start = i - DIVERGENCE_RISES;
      return {
        epochs: [epoch[start], epoch[i]],
        explanation: `train_loss rose for ${DIVERGENCE_RISES} consecutive epochs, from ${fmt(trainLoss[start])} at epoch ${epoch[start]} to ${fmt(trainLoss[i])} at epoch ${epoch[i]}.`,
        hint,
      };
    }
  }

  if (trainLoss[last] > trainLoss[0]) {
    return {
      epochs: [epoch[0], epoch[last]],
      explanation: `train_loss ended higher than it started (${fmt(trainLoss[0])} at epoch ${epoch[0]} → ${fmt(trainLoss[last])} at epoch ${epoch[last]}).`,
      hint,
    };
  }
  return null;
}

/**
 * Plateau: over the last epochs val_loss hardly changes, so training has stalled.
 * @param {Object<string, number[]>} columns - numbers per column
 * @returns {{epochs: number[], explanation: string, hint: string}|null} the finding, or null if not found
 */
function checkPlateau(columns) {
  const { epoch, val_loss: valLoss } = columns;
  const last = valLoss.length - 1;
  const start = last - PLATEAU_WINDOW;
  const change = (valLoss[last] - valLoss[start]) / valLoss[start];
  if (!(Math.abs(change) < PLATEAU_MAX_CHANGE)) return null;

  const signed = `${change >= 0 ? '+' : '−'}${Math.abs(change * 100).toFixed(1)} %`;
  return {
    epochs: [epoch[start], epoch[last]],
    explanation: `val_loss changed by only ${signed} over the last ${PLATEAU_WINDOW} epochs (epochs ${epoch[start]}–${epoch[last]}: ${fmt(valLoss[start])} → ${fmt(valLoss[last])}).`,
    hint: 'Training has stalled: more epochs like these will not help. Stop training, or lower the learning rate (for example with a learning-rate schedule).',
  };
}

// Each rule with the number of epochs it needs (spec §4.6).
const RULES = [
  { anomaly: 'Overfitting', minEpochs: OVERFIT_MIN_EPOCHS_AFTER_BEST + 1, check: checkOverfitting },
  { anomaly: 'Underfitting', minEpochs: 2, check: checkUnderfitting },
  { anomaly: 'Divergence', minEpochs: 2, check: checkDivergence },
  { anomaly: 'Plateau', minEpochs: PLATEAU_WINDOW + 1, check: checkPlateau },
];

/**
 * Checks a log for overfitting, underfitting, divergence and plateau.
 * Rules that need more epochs than the log has are skipped and reported.
 * @param {Object<string, number[]>} columns - numbers per column (from validateTrainingLog)
 * @param {boolean} hasAccuracy - whether train_acc and val_acc are present
 * @returns {{findings: {anomaly: string, epochs: number[], explanation: string, hint: string}[], skipped: string[]}}
 */
export function diagnose(columns, hasAccuracy) {
  const epochCount = columns.epoch.length;
  const findings = [];
  const skipped = [];
  for (const { anomaly, minEpochs, check } of RULES) {
    if (epochCount < minEpochs) {
      skipped.push(`${anomaly} was not checked: it needs at least ${minEpochs} epochs and the log has ${epochCount}.`);
      continue;
    }
    const finding = check(columns, hasAccuracy);
    if (finding) findings.push({ anomaly, ...finding });
  }
  return { findings, skipped };
}
