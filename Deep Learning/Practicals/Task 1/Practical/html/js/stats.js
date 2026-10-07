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
 * Describes every column of a validated training log.
 * @param {Object<string, number[]>} columns - numbers per column (from validateTrainingLog)
 * @returns {{name: string, stats: ReturnType<typeof describe>}[]} one entry per column
 */
export function summarizeColumns(columns) {
  return Object.entries(columns).map(([name, values]) => ({ name, stats: describe(values) }));
}
