# Project specification — Practical 2: Conservative neural networks with JAX (Phase B)

## 1. Objective

Complete the notebook `A1_Phase_B_Individual_Exercise.ipynb` (a copy of the provided template) so that it simulates a water reservoir, trains a conventional LSTM and a physics-structured LSTM under identical conditions, and measures what the physical structure buys along two axes: **prediction accuracy** and **physical consistency**.

- **Baseline (Option 1):** predicts the next mass `m̂(t+1)` directly.
- **Our model (Option 4, residual correction):** predicts the hidden consumption `ĉ(t) ≥ 0` and a correction `δ(t)`; the mass is computed from the balance, `m̂(t+1) = m(t) + r(t) − q(t) − ĉ(t) + δ(t)`.

Option 4 was chosen in Phase A (`../A1_Phase_A_Group_Exercise.ipynb`, Discussions 3–4) on a stated argument: a real balance is never complete, so the model should keep the physics as its backbone and expose what the physics misses. This version does not take that argument on trust. Beyond the required comparison, it tests each claim of the plan with an experiment: whether `δ` stays small, what the correction costs compared with the exact architecture, whether the advantage grows when data is scarce, how the models behave outside the training conditions, and whether the correction pays off when the equation really is incomplete.

**The system.** Hourly steps; exact mass balance `m(t+1) = m(t) + r(t) − q(t) − c(t)`; the consumption `c(t) ≥ 0` is hidden and depends on temperature, hour of day and noise. Models see `x(t) = [m, r, q, temp, hour_norm, day_year_norm]` and predict `m(t+1)`.

## 2. Scope

### In scope

- The synthetic data generator, with a sanity-check plot.
- Train / validation / test split by sequence, and normalization from the training split.
- The baseline and Option 4, trained under identical settings, with loss curves, a metrics table and comparison plots (the assignment's required deliverables).
- Naive reference predictors, to put the errors in context.
- Training refinements applied equally to every model: gradient clipping and selection of the best epoch on the validation set.
- Six extension experiments (FR7–FR12): a penalty on `δ`, two ablations, repeated seeds, the low-data ablation, a distribution-shift test, and an incomplete-physics test.
- Notes for the five reflection questions.

### Out of scope

- Option 2 (soft constraint). Its stub stays untouched.
- Other recurrent architectures (GRU, stacked or bidirectional LSTMs), attention, dropout, learning-rate schedules.
- Hyperparameter search, except the penalty weight `μ` of FR7, which is chosen on the validation set.
- Choosing anything from test-set results. The test set is only measured.
- Free-running (multi-step) forecasting: every model predicts one step ahead from observed inputs.
- Real data, GPUs, saving trained parameters.
- Writing the reflection answers (FR13 provides notes only).

## 3. Inputs

| Input | Source | Description |
| --- | --- | --- |
| Data | `generate_data` in the notebook | 450 sequences × 480 hourly steps, 6 features. Nothing is read from disk. |
| Configuration | One `CONFIG` dictionary | Seeds, sizes, hyperparameters, experiment grids. Values are fixed in `architecture.md` §4.0. |
| Phase A plan | `../A1_Phase_A_Group_Exercise.ipynb` | The chosen option and the metrics; read-only. |

## 4. Outputs

All inline in the notebook when it is run top to bottom:

- Printed shapes and checks after each step.
- The sanity-check plot of one simulated sequence.
- Training and validation loss curves of the two main models.
- The main metrics table (naive references, baseline, Option 4) and the comparison plots.
- One table and one plot per extension experiment, each followed by a short written interpretation that cites its numbers.
- Notes under each reflection question.
- Cached results of every training run in `results/` (so a second run is fast).

## 5. Functional requirements

Each requirement has an ID and a **Check** that decides whether it is met.

### FR1 — Data generation

- **FR1.1 Generator.** `generate_data(key, n_seq, T, unmetered_inflow=0.0, temp_shift=0.0)` returns `X` (n_seq, T, 6) with features in the order `[m, r, q, temp, hour_norm, day_year_norm]`, `Y = m(t+1)` (n_seq, T) and `C` (n_seq, T), following `architecture.md` §4.1.
  - Check: shapes (450, 480, 6), (450, 480), (450, 480); `C ≥ 0`; `m > 0`; `hour_norm` and `day_year_norm` in [0, 1); no `NaN`.
- **FR1.2 Exact balance.** With the default arguments the data obeys the balance.
  - Check: `max│Y − (m + r − q − C)│ < 1e-3` (float32 rounding only); within a sequence, `m(t+1)` of one step equals `m` of the next.
- **FR1.3 Reproducibility.** The same key gives the same data; different keys give different data.
- **FR1.4 Sanity plot.** One sequence: the mass; the flows `r`, `q`, `c`; the temperature.
  - Check: plot with titles, axis labels and legends; the daily cycle of `c` and of the temperature is visible.

### FR2 — Split and normalization

- **FR2.1 Split by sequence.** Sequences 0–299 are train, 300–349 validation, 350–449 test.
  - Check: shapes (300, 480, 6), (50, 480, 6), (100, 480, 6); the three index ranges are disjoint.
- **FR2.2 Normalization.** `x_mean`, `x_std` (per feature) and `y_mean`, `y_std` (scalars) are computed on the training split only and applied to all splits.
  - Check: normalized training inputs have per-feature mean ≈ 0 and std ≈ 1 (tolerance 1e-3); the statistics change if recomputed on the full data (proving the full data was not used).
- **FR2.3 Raw values kept.** The unnormalized `m, r, q` of every split stay available for the balance and the metrics.

### FR3 — Models

- **FR3.1 Baseline.** `LSTMBackbone` → `Dense(1)`, as in the template. Its output is mapped to physical units by the fixed training statistics: `m̂ = y_mean + y_std · output`.
  - Check: output shape (batch, T); 5,025 parameters.
- **FR3.2 Option 4.** `ResidualCorrectionLSTM` returns `(m_pred, c_hat, delta)`. `c_hat = softplus(head_c)`; `delta = head_δ` without constraint; `m_pred = ((m + r) − q) − c_hat + delta` in raw units, in that order of operations.
  - Check, on untrained parameters: three outputs of shape (batch, T); 5,058 parameters; `c_hat > 0`; `max│m_pred − (((m + r) − q) − c_hat + delta)│ < 1e-3`.
- **FR3.3 Option 3 (for the ablation of FR8).** `ConservativeLSTM` returns `(m_pred, c_hat)` with `m_pred = ((m + r) − q) − c_hat`.
  - Check, on untrained parameters: 5,025 parameters; physical error (FR5.1) exactly 0.
- **FR3.4 No leakage.** No model receives `C`, and no loss uses it.
  - Check: every training batch has exactly the keys listed in `architecture.md` §4.4; none of them is `C`.

### FR4 — Training

- **FR4.1 Identical conditions.** Every model is trained with the same loss (MSE on `m(t+1)` in physical units), optimizer (Adam, learning rate 1e-2, gradients clipped to global norm 1.0), hidden size 32, 300 epochs and mini-batches of 32 sequences. The only exception is the extra term of FR7, which is stated wherever it is used.
- **FR4.2 Mini-batches.** At the start of every epoch the training sequences are reshuffled with `jax.random.permutation` and a freshly split key, then sliced into batches (the last may be smaller).
- **FR4.3 Compiled step.** The update step is wrapped in `jax.jit` and created once per run.
- **FR4.4 Validation and best epoch.** After every epoch the validation MSE is computed. The parameters returned by training are those of the epoch with the lowest validation MSE. Training always runs the full 300 epochs, so training times are comparable.
- **FR4.5 History and time.** Each run stores the per-epoch training loss, the per-epoch validation MSE, the best epoch and the wall-clock training time.
- **FR4.6 Divergence.** If a loss becomes `NaN` or `Inf`, training stops with a `ValueError` naming the run, the epoch and the batch.
- **Check for FR4.1–FR4.6:** for both main models the last training loss is lower than the first; the history has 300 values; the best epoch is printed.
- **FR4.7 Loss curves.** Training and validation curves of the two main models on the same log-scale axes, with the best epochs marked.

### FR5 — Metrics

- **FR5.1** `compute_metrics(m_pred, m, r, q, y)` returns MSE, MAE and physical error `mean(max(0, −(m + r − q − m̂)))`, computed as `((m + r) − q) − m̂` in that order of operations.
  - Check on hand-made arrays: a prediction equal to `m + r − q` gives physical error 0; a prediction 0.5 above it gives 0.5; a prediction below it gives 0.
- **FR5.2 Violation rate.** The share of time steps whose implied consumption `m + r − q − m̂` is negative.
- **FR5.3 Hidden-process metrics** (models with `ĉ`): MAE of `ĉ` against the true `c`; MAE of the effective consumption `ĉ − δ` against the true `c`; mean of `δ`; mean and maximum of `│δ│`. These are diagnostics: the only use of `C`.
- **FR5.4 Naive references**, on the test set: persistence `m̂(t+1) = m(t)`, and the balance with a constant consumption equal to the mean implied consumption of the training split.

### FR6 — Main comparison (the assignment's deliverables)

- **FR6.1 Table.** Test-set MSE, MAE, physical error, violation rate and training time for: the two naive references, the baseline, and Option 4. For Option 4 also the FR5.3 diagnostics.
  - Check: all values finite; both trained models beat both naive references in MSE; Option 4's MSE is below the baseline's; Option 4's MSE is below 0.02.
- **FR6.2 Plots on one test sequence.** (a) true and predicted mass; (b) prediction error of both models; (c) `ĉ`, `ĉ − δ` and the true `c`; (d) `δ`.
- **FR6.3 Interpretation.** A Markdown cell reads the table against the assignment's expected pattern and states plainly where the results differ from it.

### FR7 — Experiment: a penalty on δ

Only `ĉ − δ` enters the prediction, so the loss cannot separate the two terms. This experiment adds a norm penalty to make "a small correction" part of the objective: `L = MSE + μ · mean(δ²)`.

- Train Option 4 for `μ ∈ {0.01, 0.1, 1.0}`, everything else identical. Together with the main model (`μ = 0`) these are the four candidates.
- **Selection on validation only:** among the candidates whose validation MSE (at their best epoch) is within 2 % of the lowest, choose the largest `μ`. The chosen model is called **Option 4-R**.
- Show a table (one row per `μ`: validation MSE, test MSE, physical error, mean `│δ│`, MAE of `ĉ`, MAE of `ĉ − δ`) and a plot of `ĉ` against the true `c` on one test sequence for `μ = 0` and the chosen `μ`.
  - Check: mean `│δ│` does not increase as `μ` grows; the chosen `μ` is printed with the rule that selected it; the test set played no part in the choice.

### FR8 — Experiment: ablations

Two models that each remove one design decision, trained under FR4.1:

- **Without the correction:** Option 3 (`δ` removed). Measures what the flexibility of Option 4 costs or gains on data that obeys the balance exactly.
- **Without output scaling:** the baseline with `m̂ = output` directly, as the template's stub reads literally.
- Show one table with the baseline, Option 4, Option 4-R and both ablations.
  - Check: Option 3's physical error is exactly 0; the written interpretation says whether Option 4 and Option 3 differ in MSE by more than the seed-to-seed spread of FR9, and what the unscaled baseline shows about under-training.

### FR9 — Experiment: repeated seeds

- Retrain the baseline and Option 4 with two more seeds (112359 and 112360; three in total with the base seed 112358). The data is fixed; the seed changes the initialization and the batch order.
- Show mean ± standard deviation of test MSE, MAE, physical error and violation rate.
  - Check: three runs per model; the interpretation says whether the gap between the models is larger than their spread.

### FR10 — Experiment: low-data ablation

- Retrain the baseline and Option 4 with `n_train ∈ {25, 50, 100, 200}` (the first `n_train` training sequences; 300 is the main run). Validation set, test set and every hyperparameter stay fixed. Normalization statistics are recomputed from the sequences actually used.
- Show a table and a log–log plot of test MSE against `n_train` for both models, and a second plot of the violation rate against `n_train`.
  - Check: 5 points per model; the ratio baseline MSE / Option 4 MSE is larger at 25 sequences than at 300.

### FR11 — Experiment: distribution shift

No new training runs. The baseline, Option 4, Option 4-R and Option 3 are evaluated on a **cold-spell test set** (their predictions on it are stored when each model is trained): the same test sequences regenerated with the temperature lowered by 15 °C, so the true consumption is often clipped at zero (the physical boundary). Inputs are normalized with the original training statistics.

- Show a table (test MSE, physical error, violation rate, in-distribution next to shifted) and a plot of the implied consumption of each model on one shifted sequence, with the zero line.
  - Check: the share of steps with true `c = 0` in the shifted set is printed and is above 5 %; Option 3's physical error is exactly 0 on the shifted set; the interpretation compares how much each model degrades.

### FR12 — Experiment: incomplete physics

The scenario Option 4 was chosen for. A second dataset is generated with an **unmetered inflow** of 1.0 per step that no model sees and the balance equation does not contain: `m(t+1) = m(t) + r(t) − q(t) − c(t) + 1.0`.

- Train Option 3 and Option 4 on it under FR4.1 and evaluate on its test split.
- Show a table (MSE, MAE, physical error, violation rate, mean `δ`, mean `│δ│`) with one extra row: the physical error and violation rate of the **true** next mass.
  - Check: the true data itself has a non-zero physical error here (the metric assumes a complete balance); the interpretation says which model fits better and why, and what "physical error" means when the equation is incomplete.

### FR13 — Reflection notes

Under each of the five reflection questions, a bullet list of notes: the numbers from this notebook (with the experiment they come from) and the key points that answer the question. The answer cells stay empty.

- Check: five lists; every number cited appears in the notebook's output; question 3 cites FR10.

### FR14 — Final checks

A final cell re-checks the assignment's pitfalls with asserts: 6 input features; `C` in no batch; disjoint splits; statistics from the training split; identical hyperparameters across runs; raw units in the balance (the stored test predictions of the main Option 4 run satisfy `m_pred = ((m + r) − q) − c_hat + delta` within 1e-3); every training run has its own PRNG key (distinct run names, `architecture.md` §4.0).

## 6. Non-functional requirements

- **Libraries.** `jax`, `flax.linen`, `optax`, `numpy`, `matplotlib`, and the standard library (`time`, `os`, `zlib`).
- **Template fidelity.** The template's section order, class names and function signatures are kept (extra keyword arguments with defaults are allowed). Sections 0–3 are unchanged; extra imports go in the first cell of section 4. The extension experiments live in a new section "8E. Extended experiments", between sections 8 and 9.
- **Reproducibility.** Every random number comes from an explicit `PRNGKey` derived from the base seed **112358** (the template's `PRNGKey(42)` in section 4 is replaced; the demo cells of section 1 keep their own keys). With the cache cleared, two full runs give the same numbers.
- **Runtime.** CPU only. A full run with an empty cache takes under 45 minutes; a run with the cache filled takes under 3 minutes.
- **Organization.** Each code cell is preceded by a Markdown cell. Key concepts get a fuller explanation (up to about 10 lines); simple steps get 2–4 lines.
- **Code quality.** Every function has a short docstring (purpose, inputs with shapes, output). Clear names; no dead code.
- **Automatic checks.** Every **Check** is written as `assert` statements with a message, after printing the values involved.
- **Honest reporting.** Interpretations describe the numbers the notebook produced. Where a result differs from the assignment's expected pattern or from `architecture.md` §7, the text says so and gives the reason.
- **Language.** English.

## 7. Acceptance criteria

- [ ] The notebook runs top to bottom after "Restart kernel and run all" with an empty `results/` folder, and every `assert` passes.
- [ ] FR1–FR2: data shapes, exact balance, splits and training-only statistics verified.
- [ ] FR3: the three models have the stated outputs and parameter counts; no leakage.
- [ ] FR4: both main models trained under identical settings; loss curves shown.
- [ ] FR5–FR6: metrics table with naive references, comparison plots, written interpretation.
- [ ] FR7: `μ` chosen on validation; table and plot.
- [ ] FR8: ablation table; Option 3's physical error exactly 0.
- [ ] FR9: mean ± std over three seeds.
- [ ] FR10: low-data table and plots.
- [ ] FR11: distribution-shift table and plot.
- [ ] FR12: incomplete-physics table.
- [ ] FR13: notes under the five reflection questions.
- [ ] FR14: pitfall asserts pass; the deliverables checklist in the notebook is ticked.
- [ ] `spec.md`, `architecture.md` and `tasks.md` describe the code that was written; every change is recorded in `log.md`.
