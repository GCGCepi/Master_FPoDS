# Project specification — Practical 2: Conservative neural networks with JAX (Phase B)

## 1. Objective

Complete the notebook `A1_Phase_B_Individual_Exercise.ipynb` (a copy of the provided template) so that it simulates a water reservoir, trains a conventional LSTM and a physics-structured LSTM under identical conditions, and compares them on **prediction accuracy** and **physical consistency**.

- **Baseline (Option 1):** predicts the next mass `m̂(t+1)` directly.
- **Our model (Option 4, residual correction):** predicts the hidden consumption `ĉ(t) ≥ 0` and a correction `δ(t)`; the mass is computed from the balance, `m̂(t+1) = m(t) + r(t) − q(t) − ĉ(t) + δ(t)`.

Option 4 was chosen in Phase A (`A1_Phase_A_Group_Exercise.ipynb`, in this folder, Discussions 3–4). Besides the required comparison, two experiments test the two claims of that plan that matter most: whether `δ` stays small (a penalty on `δ`), and whether the physics helps more when data is scarce (the low-data ablation, the assignment's recommended bonus).

**The system.** Hourly steps; exact mass balance `m(t+1) = m(t) + r(t) − q(t) − c(t)`; the consumption `c(t) ≥ 0` is hidden and depends on temperature, hour of day and noise. Models see `x(t) = [m, r, q, temp, hour_norm, day_year_norm]` and predict `m(t+1)`.

## 2. Scope

### In scope

- The data generator with a sanity-check plot; a split into train / validation / test by sequence; normalization from the training split; a cold-spell copy of the test set.
- The baseline and Option 4, trained under identical settings, with loss curves, a metrics table, Option 4 diagnostics and comparison plots (the assignment's deliverables).
- Training with gradient clipping and selection of the best epoch on the validation set, applied equally to every run.
- Two experiments: a penalty on `δ` (FR8) and the low-data ablation (FR9).
- Notes for the five reflection questions, and a final cell of pitfall checks.

### Out of scope

- Options 2 and 3: they get a short explanation in Markdown, no code (FR4.3).
- Repeated seeds, ablations, incomplete-physics experiments; other architectures, dropout, learning-rate schedules, hyperparameter search (except `μ` in FR8, chosen on validation).
- Defensive code in the training section (divergence stops, trial runs, argument-clash checks): the training code stays focused on what it does and what it shows.
- Choosing anything from test-set results. Writing the reflection answers.

## 3. Inputs and outputs

| | Description |
| --- | --- |
| Data | Generated in the notebook: 450 sequences × 480 hourly steps. Nothing is read from disk. |
| Configuration | One `CONFIG` dictionary (values in `architecture.md` §4.0). Base seed **112358**. |
| Phase A plan | `A1_Phase_A_Group_Exercise.ipynb`, read-only. |
| Outputs | Inline in the notebook: printed checks, the sanity plot, loss curves, tables, plots, interpretations, reflection notes. One cached `.npz` per training run in `results/`. |

## 4. Functional requirements

Each requirement has a **Check**. In sections 4–6, 8, 8E and 11 the check is written in the notebook as `assert` statements after printing the values involved. In section 7 the notebook carries no checks: the assistant verifies those tasks as described in `tasks.md` and the results are checked in section 11.

### FR1 — Configuration and keys (section 4.0)

- One `CONFIG` dictionary holds every setting. `data_key` gives all the data; `run_key(name, seed)` gives each training run its own key from the seed and the run's name only.
- Check: the configuration is printed; split sizes add up to `n_seq`; `results/` exists.

### FR2 — Data generation (sections 4.1–4.2)

- **FR2.1** `generate_data(key, n_seq, T, temp_shift=0.0)` returns `X` (n_seq, T, 6), `Y = m(t+1)` (n_seq, T) and `C` (n_seq, T) as defined in `architecture.md` §4.1.
  - Check: shapes (450, 480, 6), (450, 480), (450, 480); `C ≥ 0`; `m > 0`; `hour_norm`, `day_year_norm` in [0, 1); no `NaN`; `max│Y − (m + r − q − C)│ < 1e-3`; `m(t+1)` of one step equals `m` of the next; same key → same data, another key → different data.
- **FR2.2 Sanity plot** of one sequence in three panels: mass; flows `r`, `q`, `c`; temperature.
  - Check: three panels, each with a title, y label and legend; the ranges of `m`, `c` and the temperature printed.

### FR3 — Split, normalization and the shifted test set (section 4.3)

- **FR3.1** `make_dataset` returns a bundle: sequences 0–299 training (or the first `n_train`), 300–349 validation, 350–449 test; `x_mean`, `x_std`, `y_mean`, `y_std` from the training sequences used; normalized inputs `Xn_*`; raw `X_*` kept.
- **FR3.2** `DATA` is the main bundle. `DATA_SHIFT` is the same data 15 °C colder, normalized with `DATA`'s statistics; only its test split is used (FR7.3).
- Check: split shapes (300 / 50 / 100); disjoint index ranges; normalized training inputs with mean ≈ 0 and std ≈ 1 (tolerance 1e-3); statistics differ from full-data statistics; a bundle with `n_train=25` has the same validation and test arrays as `DATA`; `DATA_SHIFT` has `DATA`'s `x_mean`, a test temperature exactly 15 lower, and the share of its test steps with `c = 0` printed.

### FR4 — Models (sections 5–6)

- **FR4.1 Baseline.** `LSTMBackbone` (one `nn.LSTMCell` in `nn.RNN`) → `Dense(1)`. The output is mapped to physical units outside the module: `m̂ = y_mean + y_std · output`.
  - Check, at the start of section 5: hidden states of shape (2, 480, 32) and output (2, 480) on two training sequences; 5,025 parameters.
- **FR4.2 Option 4.** `ResidualCorrectionLSTM` returns `(m_pred, c_hat, delta)`; `c_hat = softplus(head_c)`; `delta` unconstrained; `m_pred = ((m + r) − q) − c_hat + delta` in raw units.
  - Check, untrained: three outputs of shape (2, 480); 5,058 parameters; `c_hat > 0`; `m_pred` equals the balance within 1e-3.
- **FR4.3 Options 2 and 3.** The template's Markdown and stub code for each is replaced by one short Markdown cell: what the option does, and why it was not chosen (from Phase A). No code, no `TODO`.
- **FR4.4 Uniform interface.** `build_model(kind, data)` for `kind ∈ {"baseline", "option4"}` returns `(model, init_fn, predict_fn)`; `predict_fn(params, xn, x_raw)` → `(m_pred, c_hat, delta)` in physical units (`None, None` for the baseline). It is in its own cell, after Option 4.
  - Check: for both kinds, `m_pred` of shape (2, 480), with a mean within 2 · `y_std` of `y_mean`; the baseline returns `c_hat is None`.

### FR5 — Training (section 7)

- **FR5.1 Identical conditions.** Every run: MSE on `m(t+1)` in physical units; Adam (learning rate 1e-2) after clipping the global gradient norm to 1.0; hidden size 32; 300 epochs; batches of 32 sequences, reshuffled every epoch with a freshly split key (the last batch of each epoch has 12). The only exception is the `μ · mean(δ²)` term of FR8.
- **FR5.2 Best epoch.** After every epoch the validation MSE is computed; training returns the parameters of the epoch with the lowest one. All 300 epochs always run.
- **FR5.3 Runs and cache.** `run_experiment` trains one model, times it (`time.time()`, including compilation) and stores its loss histories, best epoch, time, parameter count and test predictions (and, when asked, its predictions on `DATA_SHIFT`). `run_cached` saves and reloads each result in `results/<name>.npz` and records the run in `RUNS`.
- **FR5.4 Main runs.** `baseline_s112358` and `opt4_s112358`, both also predicting on `DATA_SHIFT`.
- **FR5.5 Loss curves.** Training (solid) and validation (dashed) curves of both main runs on log–log axes, the best epochs marked, and one printed line per model: first and last training loss, best epoch and its validation MSE.
- **FR5.6 Conclusion.** One Markdown cell closes the section, citing the numbers printed in FR5.5.
- **One output per fact.** Each value appears once in the section's output: run cells print only "computed" or "loaded" per run; the training time appears only in the table of FR6; the best epoch only in FR5.5's printed line.

### FR6 — Metrics and main comparison (section 8, first part)

- **FR6.1** `compute_metrics(m_pred, m, r, q, y)` returns MSE, MAE and physical error `mean(max(0, −(((m + r) − q) − m̂)))`; `violation_share` returns the share of steps with negative implied consumption; `evaluate(result, data, prefix)` gathers them from a run's stored predictions (plus the Option 4 diagnostics of FR7.1 when the run has `c_hat`).
- **FR6.2 Table.** A table with one row per metric and one column per model (Baseline, Option 4): MSE, MAE, physical error, share of steps with negative implied consumption (%), training time (s). Under it, printed "Reading" lines generated from the values: the ratio of the two MSEs, and for each model whether its physical error is zero or not, with what that means for that model (a guarantee only where the architecture gives one, which neither of these does).
  - Check: all values finite.

### FR7 — Diagnostics, cold spell, plots, interpretation (section 8, rest)

- **FR7.1 Option 4 diagnostics** (`C` is used only here, in FR7.3's share of steps with `c = 0`, and in FR8's table and plot, always after training): mean `δ`, mean and maximum `│δ│`, MAE of `ĉ` and of `ĉ − δ` against the true `c`, with printed interpretation lines.
- **FR7.2 Comparison plots** on the first week (168 h) of test sequence 0, four panels: (a) true and predicted mass; (b) prediction error of both models; (c) `ĉ`, `ĉ − δ` and the true `c`; (d) `δ`.
  - Check: four panels with titles and legends.
- **FR7.3 Cold-spell table.** The two main models on `DATA_SHIFT`'s test split: MSE in distribution and on the cold spell, how many times worse, physical error and violation share on the cold spell. No new training.
  - Check: the share of cold-spell test steps with `c = 0` and the true volume ranges of the training set and of the cold-spell test set are printed; the inputs use `DATA`'s statistics.
- **FR7.4 Interpretation.** One Markdown cell: accuracy, physical consistency (against the assignment's expected pattern, stating plainly where it differs), cost, the `ĉ`/`δ` identifiability result, and the cold spell.

### FR8 — Experiment 8E.1: a penalty on δ

- Retrain Option 4 with `L = MSE + μ · mean(δ²)` for `μ ∈ {0.01, 0.1, 1.0}`; with the main run (`μ = 0`) these are four candidates. **Selection on validation only:** among the candidates whose best validation MSE is within 2 % of the lowest, choose the largest `μ` (Option 4-R).
- Table: one row per `μ` with validation MSE, test MSE, physical error, violation share, mean `│δ│`, mean `δ`, MAE of `ĉ`, MAE of `ĉ − δ`. Plot: `ĉ` against the true `c` on the first week of test sequence 0 for `μ = 0` and the chosen `μ`. Interpretation.
- Check: four candidates evaluated; the chosen `μ` is printed with its rule and threshold; the choice uses only validation values.

### FR9 — Experiment 8E.2: low-data ablation

- Retrain both models with `n_train ∈ {25, 50, 100, 200}` (300 is the main run); validation set, test set and all settings fixed; statistics from the sequences used. No cold-spell predictions.
- Table (MSE of both, ratio baseline / Option 4, violation share and physical error of both) and two plots against `n_train` (log–log test MSE with the 0.01 noise floor; violation share). Interpretation.
- Check: five points per model; validation and test arrays identical across sizes.

### FR10 — Reflection notes (section 9)

Under each of the five questions, a bullet list of notes with the numbers from this notebook (naming where they come from) and the key points. The answer cells stay empty.
- Check: five lists; every number cited appears in the notebook's output; question 3 cites 8E.2.

### FR11 — Final checks (section 11)

One code cell after the template's pitfall list, checking over every run in `RUNS`:

1. Six input features; a training batch holds exactly `xn`, `x`, `y` (never `C`).
2. Train, validation and test share no sequence.
3. Statistics come from the training split of each bundle; `DATA_SHIFT` reuses `DATA`'s.
4. Identical settings: 300 recorded epochs in every run, the expected parameter count per model, a non-zero `μ` only in the runs of 8E.1.
5. Raw units in the balance: the stored test predictions of `opt4_s112358` equal `((m + r) − q) − ĉ + δ` within 1e-3.
6. Every run has its own PRNG key.

**Output:** one line per check (`✓ 1. …`, short plain words), then `All 6 checks passed.` No lists of run names, keys or arrays.

## 5. Non-functional requirements

- **Libraries.** `jax`, `flax.linen`, `optax`, `numpy`, `matplotlib`, and `time`, `os`, `zlib` from the standard library.
- **Template fidelity.** Section order, class names and the signatures of `make_train_step` and `train_model` are kept (extra keyword arguments allowed). Sections 0–3 unchanged; extra imports in the first cell of section 4. The Option 2 and 3 cells are replaced as in FR4.3. The experiments go in a new section "8E. Extended experiments" between 8 and 9.
- **Reproducibility.** Every random number comes from a key derived from the base seed 112358 (the template's `PRNGKey(42)` in section 4 is replaced). With `results/` deleted, two full runs give the same numbers.
- **Runtime.** CPU only. With the cache filled, the notebook re-runs without retraining.
- **Organization.** A Markdown cell before each code cell: 2–4 lines for simple steps, up to about 10 for key concepts. Every function has a short docstring (purpose, inputs with shapes, output).
- **Honest reporting.** Interpretations are written after the numbers exist and cite them. Where a result differs from the assignment's expected pattern, the text says so and gives a reasoned explanation.
- **Language.** English.

## 6. Acceptance criteria

- [ ] The notebook runs top to bottom with an empty `results/` folder; every `assert` passes.
- [ ] FR1–FR4: configuration, data, bundles and models as specified; Options 2 and 3 explained, not coded.
- [ ] FR5: both main models trained under identical settings; loss curves with one printed line per model; a conclusion cell; no value printed twice.
- [ ] FR6–FR7: metrics table, diagnostics, four-panel plot, cold-spell table, interpretation.
- [ ] FR8–FR9: both experiments with tables, plots and interpretations.
- [ ] FR10: notes under the five questions.
- [ ] FR11: six checks pass with the short output; the deliverables checklist ticked (including the low-data ablation), except the written answers.
- [ ] `spec.md`, `architecture.md` and `tasks.md` describe the code that was written; changes are recorded in `log.md`.
