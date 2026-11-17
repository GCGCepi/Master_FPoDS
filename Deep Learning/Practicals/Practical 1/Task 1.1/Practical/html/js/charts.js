// Training-curve charts drawn with Chart.js (loaded as the global `Chart`
// by a <script> tag in index.html). Colors come from the CSS variables, so
// the charts follow the light/dark theme.

/* global Chart */

/**
 * Tells whether the Chart.js library was loaded (it comes from a CDN, so it
 * can be missing when there is no internet connection).
 * @returns {boolean} true if charts can be drawn
 */
export function chartsAvailable() {
  return typeof Chart !== 'undefined';
}

/**
 * Reads the current theme colors from the CSS variables.
 * @returns {{train: string, val: string, best: string, text: string, muted: string, grid: string}}
 */
function themeColors() {
  const css = getComputedStyle(document.documentElement);
  const read = (name) => css.getPropertyValue(name).trim();
  return {
    train: read('--series-train'),
    val: read('--series-val'),
    best: read('--series-best'),
    text: read('--text'),
    muted: read('--muted'),
    grid: read('--border'),
  };
}

/**
 * Builds the Chart.js configuration shared by both charts.
 * @param {string} title - chart title
 * @param {string} yLabel - label of the vertical axis
 * @returns {object} Chart.js configuration (without data yet)
 */
function baseConfig(title, yLabel) {
  return {
    type: 'line',
    data: { datasets: [] },
    options: {
      locale: 'en-US', // dot as decimal separator, whatever the browser language
      animation: false, // redraws instantly, also for long logs
      maintainAspectRatio: false, // the CSS box decides the height
      // Hovering anywhere above an epoch shows the values of all series there.
      interaction: { mode: 'nearest', axis: 'x', intersect: false },
      scales: {
        x: { type: 'linear', title: { display: true, text: 'Epoch' }, ticks: { precision: 0 } },
        y: { type: 'linear', title: { display: true, text: yLabel } },
      },
      plugins: {
        title: { display: true, text: title },
        legend: {
          labels: {
            // Show each series as it looks in the chart: a (dashed) line, or
            // a diamond for the best-epoch marker, instead of a filled box.
            usePointStyle: true,
            generateLabels: (chart) => Chart.defaults.plugins.legend.labels.generateLabels(chart)
              .map((item) => {
                const dataset = chart.data.datasets[item.datasetIndex];
                return {
                  ...item,
                  pointStyle: dataset.showLine === false ? 'rectRot' : 'line',
                  lineDash: dataset.borderDash, // not copied by Chart.js when point styles are used
                };
              }),
          },
        },
        tooltip: {
          callbacks: {
            title: (items) => `Epoch ${items[0].parsed.x}`,
            // raw.y is the number read from the CSV, shown without rounding.
            label: (item) => `${item.dataset.label}: ${item.raw.y}`,
          },
        },
      },
    },
  };
}

/**
 * Creates the (still empty) loss and accuracy charts.
 * @param {HTMLCanvasElement} lossCanvas - canvas for the loss chart
 * @param {HTMLCanvasElement} accCanvas - canvas for the accuracy chart
 * @returns {{loss: Chart, acc: Chart}} handles used by the other functions
 */
export function createCurveCharts(lossCanvas, accCanvas) {
  return {
    loss: new Chart(lossCanvas, baseConfig('Loss per epoch', 'Loss')),
    acc: new Chart(accCanvas, baseConfig('Accuracy per epoch', 'Accuracy')),
  };
}

/**
 * Builds a line dataset. Validation lines are dashed so the two series can
 * be told apart without relying on color.
 * @param {string} label - legend label
 * @param {number[]} epochs - x values
 * @param {number[]} values - y values
 * @param {string} color - line color
 * @param {boolean} dashed - true for a dashed line
 * @returns {object} Chart.js dataset
 */
function lineDataset(label, epochs, values, color, dashed) {
  return {
    label,
    data: epochs.map((x, i) => ({ x, y: values[i] })),
    borderColor: color,
    backgroundColor: color,
    borderDash: dashed ? [6, 4] : [],
    borderWidth: 2,
    pointRadius: 0,
    pointHoverRadius: 4,
  };
}

/**
 * Builds the best-epoch marker: a dataset with a single point and no line,
 * so no Chart.js plugin is needed.
 * @param {number} epoch - best epoch
 * @param {number} value - value of the validation series at that epoch
 * @param {string} color - marker color
 * @returns {object} Chart.js dataset
 */
function markerDataset(epoch, value, color) {
  return {
    label: `Best epoch (${epoch})`,
    data: [{ x: epoch, y: value }],
    showLine: false,
    pointStyle: 'rectRot', // a diamond
    pointRadius: 8,
    pointHoverRadius: 10,
    borderColor: color,
    backgroundColor: color,
  };
}

/**
 * Applies the theme colors to the axes, title and legend of a chart.
 * @param {Chart} chart - chart to style
 * @param {ReturnType<typeof themeColors>} colors - current theme colors
 * @returns {void}
 */
function styleChart(chart, colors) {
  const { scales, plugins } = chart.options;
  for (const axis of [scales.x, scales.y]) {
    axis.ticks.color = colors.muted;
    axis.title.color = colors.text;
    axis.grid = { color: colors.grid };
  }
  plugins.title.color = colors.text;
  plugins.legend.labels.color = colors.text;
}

/**
 * Draws the curves of a log, with the best epoch marked. The accuracy chart
 * is hidden when the log has no accuracy.
 * @param {{loss: Chart, acc: Chart}} handles - from createCurveCharts
 * @param {Object<string, number[]>} columns - numbers per column (from validateTrainingLog)
 * @param {boolean} hasAccuracy - whether train_acc and val_acc are present
 * @param {number} bestEpoch - epoch with the lowest val_loss (from analyzeLog)
 * @returns {void}
 */
export function showCurves(handles, columns, hasAccuracy, bestEpoch) {
  const colors = themeColors();
  const { epoch } = columns;
  const best = epoch.indexOf(bestEpoch);

  handles.loss.data.datasets = [
    lineDataset('train_loss', epoch, columns.train_loss, colors.train, false),
    lineDataset('val_loss', epoch, columns.val_loss, colors.val, true),
    markerDataset(bestEpoch, columns.val_loss[best], colors.best),
  ];
  styleChart(handles.loss, colors);
  handles.loss.canvas.setAttribute('aria-label',
    `Line chart of train_loss and val_loss over ${epoch.length} epochs. Best epoch: ${bestEpoch}.`);
  handles.loss.update();

  const accBox = handles.acc.canvas.parentElement;
  accBox.hidden = !hasAccuracy;
  if (hasAccuracy) {
    handles.acc.data.datasets = [
      lineDataset('train_acc', epoch, columns.train_acc, colors.train, false),
      lineDataset('val_acc', epoch, columns.val_acc, colors.val, true),
      markerDataset(bestEpoch, columns.val_acc[best], colors.best),
    ];
    styleChart(handles.acc, colors);
    handles.acc.canvas.setAttribute('aria-label',
      `Line chart of train_acc and val_acc over ${epoch.length} epochs. Best epoch: ${bestEpoch}.`);
    handles.acc.update();
  }
}

/**
 * Switches the loss chart between a linear and a logarithmic y axis.
 * A log scale makes small late-training changes in the loss visible.
 * @param {{loss: Chart, acc: Chart}} handles - from createCurveCharts
 * @param {boolean} on - true for a logarithmic scale
 * @returns {void}
 */
export function setLogScale(handles, on) {
  const y = handles.loss.options.scales.y;
  y.type = on ? 'logarithmic' : 'linear';
  y.title.text = on ? 'Loss (log scale)' : 'Loss';
  handles.loss.update();
}
