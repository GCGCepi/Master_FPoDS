# Log

This folder holds the version that will be implemented. It was not written from scratch: it is a selection from two earlier versions, built and run first so that the choice could be made on finished notebooks rather than on plans. This log records why there were two versions, what each produced, how the user filtered them, and how the gaps left by the filter were closed.

## 1. Why a simple and a complex version

The assignment can be satisfied with little: a generator, two models, two training runs, a metrics table and the reflection answers. It also leaves room for much more (validation, ablations, the optional low-data experiment). Deciding in advance how much of that is worth the extra code and the extra time is hard. So the same plan was written twice, at two levels, and both were implemented by an AI assistant following its documents:

- **`practical2_simple`**: the minimum the assignment asks for. Train/test split only, the template's training settings, one Option 4 model, a metrics table, diagnostics, plots, reflection notes, and a short final check.
- **`practical2_complex`**: the same deliverables plus everything that tests the Phase A argument for Option 4: a validation set with best-epoch selection, gradient clipping, a cache of runs, naive reference predictors, and six experiments (penalty on `δ`, ablations with Option 3 and an unscaled baseline, three seeds, low data, a cold-spell test set, an unmetered inflow).

Both versions share the decisions taken from a prototype before writing them (2026-11-16):

- **Choice of model.** Phase A chose Option 4 (residual correction) against the baseline. The user fixed that both versions use it.
- **Generator.** With the template's example values the reservoir loses about 0.35 per step and the volume becomes negative. Inflow `U[2.35, 3.85]` and `m(0) = 150 + U[0, 10]` keep it positive.
- **Baseline output scaling.** Predicting a mass of about 155 straight from the LSTM output does not converge in 300 epochs; the output is scaled with training statistics.
- **Identifiability.** Under the plain MSE, Option 4 cannot separate `ĉ` from `δ`: only `ĉ − δ` is learned. Both versions report this instead of presenting `ĉ` as the recovered consumption.
- **Seed.** Changed from 42 to 112358 by the user on 2026-11-17, together with a consistency review of the complex documents.

## 2. What each version produced

Both notebooks were run end to end on a 2-core CPU, seed 112358.

| | Simple | Complex |
| --- | --- | --- |
| Notebook | 69 cells, runtime ≈ 2 min 45 s | 92 cells, runtime ≈ 18.7 min (19 s with the cache) |
| Baseline test MSE / MAE | 0.0169 / 0.0948 | 0.01427 / 0.0909 |
| Option 4 test MSE / MAE | 0.0100 / 0.0800 | 0.01015 / 0.0804 |
| Baseline physical error | 4.7e-5 (0.017 % of steps) | 6e-5 (0.027 % of steps) |
| Option 4 physical error | 0 | 0 |
| MAE of `ĉ` / of `ĉ − δ` | 0.763 / 0.080 | 0.796 / 0.080 |

What the complex experiments added to the picture:

- **Penalty on `δ` (8E.1):** with `μ = 1.0`, chosen on validation, `δ` almost vanishes (mean `│δ│` 0.002) and `ĉ` alone becomes the consumption (MAE 0.080), with no loss of accuracy.
- **Low data (8E.4):** the MSE ratio baseline / Option 4 is 453 with 25 sequences and 1.4 with 300; the baseline violates the balance on 5.8 % of steps at 25 sequences, Option 4 never.
- **Cold spell (8E.5):** baseline MSE 16,748 against 0.165 for Option 4.
- **Ablations, seeds, incomplete physics (8E.2, 8E.3, 8E.6):** Option 3 equals Option 4 on this data; the gap between the models is far larger than the seed spread; with an unmetered inflow Option 4 (0.0102) beats Option 3 (0.0322).

The simple version was readable but thin; the complex one answered every question but was long, and its training section in particular mixed results with defensive code and repeated information.

## 3. The user's filter (2026-11-25)

The user went through both notebooks section by section and kept, for each part, the version they preferred:

| Part | Kept | Notes from the user |
| --- | --- | --- |
| Configuration and random keys (4.0) | Complex | |
| Sanity-check plot (4.2) | Complex | |
| Split, normalization and the shifted test set (4.3) | Complex | |
| Section 5, with the hidden states shown at the start | Complex | |
| Options not used | Neither | A short explanation instead of the template's code or `TODO` stubs |
| Option 4 | Complex | |
| "A uniform interface for the three models" | Complex | But without Option 3 implemented in the same cell |
| Section 7, training | Middle ground | The complex code length, but focused on results: only important details, no failsafes, each value shown once (the training time was shown twice), one conclusion cell instead of many small ones |
| Section 8, first part | Simple | |
| Extended experiments | Complex 8E.1 and 8E.4 only | |
| Section 11 | Complex | With a simpler, more understandable output |

## 4. How the filter was turned into this version

Most choices map directly onto `spec.md` and `architecture.md`. These points needed a decision, taken as follows:

- **Option 3 removed entirely.** It was used only by the ablation (8E.2), the cold spell (8E.5) and the incomplete-physics experiment (8E.6), all three dropped. With it gone, the uniform interface covers two kinds (`baseline`, `option4`), which also resolves the remark about Option 3 sharing the interface's cell. Options 2 and 3 each get a short Markdown note on what they do and why they were not chosen.
- **The shifted test set keeps a use.** It was kept in 4.3, but its experiment (8E.5) was dropped. Rather than build an unused bundle, the two main runs predict on it and section 8 shows one small table (MSE in and out of distribution, violations on the cold spell). No extra training. If this is not wanted, removing `DATA_SHIFT`, the `eval_sets` argument of the main runs and task 4.4 is enough.
- **Section 7, middle ground.** Kept from the complex version: clipping, validation with best-epoch selection, `run_experiment` / `run_cached` with the cache (needed by the 11 experiment runs), and the loss plot with validation curves. Removed: the `NaN` stop, the 3-epoch and 2-epoch trial cells, the argument-clash check on run names, the recording of batch keys and sizes in each run, and the per-run training-loss summary. Each value is printed once: run cells say only "computed" or "loaded", the loss plot is followed by one line per model (losses, best epoch), and the training time appears only in section 8's table. One conclusion cell closes the section. Tasks 3.1–3.2 are verified by the assistant with temporary cells that are deleted, so correctness is still checked without leaving failsafes in the notebook.
- **Section 8.** The first part follows the simple layout: the metrics cell with a metric-by-model table and "Reading" lines, then the Option 4 diagnostics. The rest takes the complex four-panel comparison plot and a single interpretation cell. The naive reference predictors of the complex table are not included.
- **Experiments renumbered.** 8E.1 (penalty on `δ`) and 8E.2 (low data, formerly 8E.4). The configuration drops the seed list and the unmetered inflow.
- **Section 11.** The complex checks, minus those about the removed runs and bundles, reduced to six. Each prints one plain line (`✓ 1. …`) and the cell ends with "All 6 checks passed."; no lists of run names or keys.
- **No expected results.** This version is a template, not a guide to reproduce particular numbers: `architecture.md` describes what to build, and the documents contain no target values. The numbers in §2 of this log are the history of the earlier versions only. The checks verify correctness (shapes, leakage, raw units, keys, validation-only selection), never the size or direction of a result. (Decided with the user on 2026-11-25, after a first draft that listed the complex run's numbers as expected results.)
- **Phase A notebook.** Copied into this folder, where both earlier implementations kept it.

## 5. Implementation

(Entries added by the assistant as tasks are completed.)

### 2026-11-27 — Document fixes before Task 0.1 (approved by the user)

- `architecture.md` §1 and §7: folder name `practical2_plantilla/` → `practical2/`, the folder actually in use.
- `spec.md` §2 (out of scope): the reference for the Options 2 and 3 notes corrected from FR3.3 to FR4.3.
- `spec.md` §4 intro: section 8 added to the sections whose checks are `assert` statements in the notebook (FR6.2 has one), matching `tasks.md`.
- Execution environment: the notebook is run with `jupyter nbconvert --execute` in the Linux shell attached to this folder (2-core CPU), with `jax[cpu]`, `flax`, `optax` installed there from PyPI.

### 2026-11-27 — Task 0.1 (sections 0–1 run unchanged)

- Versions: JAX 0.6.2, Flax 0.10.7, Optax 0.2.9; device `CpuDevice(id=0)`.
- `f'(2) = 14.0`; the MLP demo's loss falls from 5.08 (epoch 0) to 0.0177 (final).
- The full template also executes top to bottom without error (checked on a scratch copy outside the folder).

### 2026-11-27 — Consistency fixes from the template (approved by the user)

- `spec.md`: FR7.1 states every use of `C` (FR7.1, FR7.3's share of steps with `c = 0`, FR8); FR7.3 lists the "times worse" column; FR5.5 says log–log axes.
- `architecture.md` §4.5 and `tasks.md` 4.1 no longer refer to "the simple version"; `LOW_DATA` added to the names of section 8E in §3.

### 2026-11-27 — Task 0.2 (section 4.0)

- New Markdown ★ and code cell at the start of section 4: `import os, zlib`, `CONFIG` (as in `architecture.md` §4.0), `run_key`, `data_key`, `results/`.
- The template's `key = jax.random.PRNGKey(42)` and its split were removed from the generator stub cell; the rest of that stub is left for Task 1.1.
- Verified: configuration printed; 300 + 50 + 100 = 450; `results/` exists. Outside the notebook: `run_key` is the same for the same name, different for two names, and different from `data_key`. The whole notebook still runs top to bottom.

### 2026-11-27 — Task 1.1 (section 4.1, generator)

- New Markdown ★ before the generator; the template's stub cell completed in place with `generate_data(key, n_seq=450, T=480, temp_shift=0.0)` as in `architecture.md` §4.1 (8 sub-keys; mass rolled forward with `cumsum`), followed by the FR2.1 checks.
- Verified on `data_key`: shapes (450, 480, 6) / (450, 480) / (450, 480); min `c` = 0.151; `m` in [80.33, 250.34]; `hour_norm` in [0, 0.958]; `day_year_norm` in [0.000005, 0.999999]; max balance residual 3.05e-05 (float32 rounding in the cumulative sum); continuity, same-key and other-key checks pass. The whole notebook still runs top to bottom.

### 2026-11-27 — Task 1.2 (section 4.2, sanity plot)

- New Markdown cell; the template's plot stub completed in place: training sequence 0, three stacked panels (mass `m(t+1)`; `r`, `q` thin and translucent with `c` thick and black, y limits 0–5, legend above the curves; temperature), each with title, y label, legend and light grid.
- Printed ranges for sequence 0: `m` in [156.09, 177.03], `c` in [0.372, 2.747], temperature in [9.2, 29.5] °C. The legends of the mass and temperature panels use `loc="best"` (a fixed corner hid 9 temperature points; now at most 1). The whole notebook still runs top to bottom.

### 2026-11-27 — Task 1.3 (section 4.3, bundles)

- New Markdown ★ after the template's "Split and normalize" text; the split stub completed in place with `make_dataset`, `DATA`, `DATA_SHIFT`, and a temporary `n_train=25` bundle used only by the checks (deleted at the end of the cell).
- Statistics computed in float64 on the training sequences used; normalized inputs stored as float32.
- Verified: splits 300 / 50 / 100, disjoint (sequences identified by their first 5 volumes, as in section 11); normalized training inputs max |mean| 4.3e-09, max |std − 1| 2.1e-09; training `x_mean` differs from the all-sequence mean by up to 0.398; the 25-sequence bundle has its own statistics (`y_mean` 161.478 vs 156.482) and identical validation/test arrays; `DATA_SHIFT` reuses `DATA`'s statistics, its test temperature is 15 °C lower (within 1e-4, float32 rounding), same `r`, `q`; 14.4 % of its test steps have `c = 0` (0.0 % in `DATA`). The whole notebook still runs top to bottom.
- Note: FR3 says the shifted temperature is "exactly" 15 lower; in float32 it is equal within 1e-4, which is what the check tests.

### 2026-11-27 — Task 2.1 (section 5, baseline)

- New Markdown ★ (many-to-many prediction, Flax's orthogonal recurrent initialization and zero biases, output scaling outside the module, parameter count); the template's class stub completed in place with `LSTMBackbone`, `ConventionalLSTM`, `n_parameters` and the untrained check (key `run_key("check5_s112358")`).
- Verified: hidden states (2, 480, 32), values in [−0.983, 0.941]; output (2, 480); 4,992 + 33 = 5,025 parameters. The whole notebook still runs top to bottom.

### 2026-11-27 — Task 2.2 (section 6, Options 2 and 3)

- The template's Markdown and stub code cells for Option 2 (`SoftConstraintLSTM`) and Option 3 (`ConservativeLSTM`) replaced by one Markdown cell each: what the option predicts, where the physics enters, and why Phase A (Discussion 3) did not choose it.
- Verified: no `SoftConstraintLSTM` or `ConservativeLSTM` code left in section 6; the only remaining `TODO` there is the Option 4 stub, completed by Task 2.3. The whole notebook still runs top to bottom.

### 2026-11-27 — Task 2.3 (section 6, Option 4)

- New Markdown ★ after the template's Option 4 text; the stub completed in place with `ResidualCorrectionLSTM` (heads `head_c` → softplus and `head_delta`; `m_pred = ((m + r) − q) − c_hat + delta` in raw units) and its untrained check (key `run_key("check6_s112358")`).
- Verified: three outputs of shape (2, 480); 5,058 parameters; untrained `c_hat` in [0.427, 1.103] (> 0), `delta` in [−0.550, 0.477]; balance residual 0.0. The whole notebook still runs top to bottom.

### 2026-11-27 — Task 2.4 (section 6, uniform interface)

- New Markdown cell and own code cell after Option 4: `build_model(kind, data)` for `"baseline"` and `"option4"` → `(model, init_fn, predict_fn)`; the baseline's output scaling uses the given bundle's training statistics; an unknown `kind` raises `ValueError`.
- Verified (untrained, two training sequences, keys `run_key("check6_<kind>_s112358")`): baseline `m_pred` (2, 480), mean 154.48, `c_hat is None`, 5,025 parameters; Option 4 `m_pred` (2, 480), mean 176.76 (it follows the sequences' own volumes through the balance), 5,058 parameters; both within `y_mean ± 2·y_std` = 156.48 ± 33.44. The whole notebook still runs top to bottom.

### 2026-11-27 — Task 3.1 (section 7, training functions)

- New Markdown ★ (mini-batches of sequences, reshuffling with split keys, the loss, clipping, best epoch on validation, why `C` is in no batch); the template's training cell completed in place: `make_train_step` (unchanged), `HIDDEN_SIZE`/`EPOCHS`/`BATCH_SIZE` from `CONFIG`, `optimizer = chain(clip_by_global_norm(1.0), adam(1e-2))`, `make_batch`, `make_loss_fn`, `make_val_fn`, `train_model` (template signature + `val_fn`).
- Verified with a temporary cell on a scratch copy (never in the notebook): a 3-epoch baseline run gives training losses 160.14 → 22.24 → 9.63 and validation MSEs 35.60 → 11.34 → 4.38, all finite; the returned parameters give the lowest validation MSE (4.3815, epoch 3); a batch has exactly the keys `x`, `xn`, `y`; Option 4's loss with `mu = 0.1` equals MSE + 0.1·mean(δ²) exactly.
- Timing on this 2-core CPU: one jitted step on 32 sequences ≈ 92 ms (batch gathering ≈ 2 ms), so ≈ 0.87 s per epoch on 300 sequences plus ≈ 5 s of compilation per run: ≈ 4.5 min per full-size run, roughly 35 min for all 13 runs (once; then cached).

### 2026-11-27 — Task 3.2 (section 7, runs and cache)

- The template's "BASELINE model" stub cell now holds `run_experiment`, `RUNS` and `run_cached`, with a short Markdown cell before it; the "YOUR MODEL" stub is left for the main runs (Task 3.3).
- Loaded `.npz` scalars are converted back to Python numbers, so a cached result has the same keys, values and types as a freshly computed one.
- Verified on a scratch copy (with `train_model` wrapped to 2 epochs there only): an Option 4 run with `eval_sets={"shift": DATA_SHIFT}` returns `train_loss`, `val_loss` (2,), `best_epoch`, `time`, `n_params` (5,058), `test_m_pred`, `test_c_hat`, `test_delta` and the three `shift_` arrays, all (100, 480); a baseline run returns the same without `c_hat`/`delta`; a second call prints "loaded from cache" and returns identical arrays and types; `RUNS` records kind, tag, μ and seed. The scratch copy, its `.npz` files and its `RUNS` entries were deleted; the notebook's `results/` is still empty. The whole notebook still runs top to bottom.

### 2026-11-27 — Task 3.3 (section 7, main runs)

- The template's "YOUR MODEL" stub cell now holds the two main runs (`RESULTS["baseline"]`, `RESULTS["opt4"]`, both with `eval_sets={"shift": DATA_SHIFT}`), with a short Markdown cell before it. Output: two lines, both "computed".
- **Execution environment changed.** The shell attached to this folder stops background processes when each call ends and limits a call to 3 minutes, so a full training run cannot finish there. From this task on, the notebook is executed in the assistant's own workspace (Linux, 2-core CPU, same JAX 0.6.2 / Flax 0.10.7 / Optax 0.2.9), and the notebook and `results/` are copied back to this folder after every task (as `aiRules.md` §3 allows). The folder's shell is still used to edit the documents and to check that the copied cache loads ("loaded from cache" for both runs, no retraining).
- Headline numbers (from the cache files; printed in the notebook only from Task 3.4 on): baseline 120 s, best epoch 241, best validation MSE 0.01395, training loss 212.98 → 0.02722; Option 4 128 s, best epoch 271, best validation MSE 0.00992, training loss 0.510 → 0.01007. All 300 values of both histories finite. Training times are measured in the assistant's workspace.

### 2026-11-27 — Task 3.4 (section 7, loss curves and conclusion)

- New Markdown cell and the template's plot stub completed with `plot_losses(runs)`: training (solid) and validation (dashed) per model in one colour, log–log axes, a dot at the best epoch; then one printed line per model. Then the conclusion Markdown cell of section 7.
- Printed: Baseline 213 → 0.02722, best epoch 241, validation MSE 0.01395; Option 4 0.5097 → 0.01007, best epoch 271, validation MSE 0.00992. Section 7's output now holds: two "loaded from cache"/"computed" lines, the plot, and these two lines; no value appears twice.
- Checks behind the conclusion (assistant, not in the notebook): after epoch 20 the baseline's validation MSE ranges 0.0139–0.2132 and changes by up to ×9.2 between consecutive epochs; Option 4's first-epoch loss is below the baseline's first seven epochs (the baseline's epoch 8 is 0.505). As a diagnostic only, the irreducible error from `noise_c` was computed from `C`: 0.00983 on validation, 0.01006 on test; Option 4's 0.00992 is just above it, so not an implausible value. The conclusion cites only printed numbers and the definition-based 0.1² = 0.01.
- The whole notebook runs top to bottom with the cache filled (no retraining).

### 2026-11-27 — Task 4.1 (section 8, metrics and main table)

- New Markdown ★ (accuracy vs consistency, implied consumption, one-sided physical error, violation share, why a zero is measured and not guaranteed); the template's `compute_metrics` stub completed in place with `compute_metrics`, `violation_share`, `evaluate` (with the Option 4 diagnostics of FR7.1, printed in Task 4.2), the metric × model table and generated "Reading" lines.
- The implied consumption is computed in float32 in Option 4's order of operations; averages in float64. The evaluated metrics are kept in `EVAL` (not named in `architecture.md`; used by the next tasks of section 8).
- Test set: MSE baseline 0.01529 / Option 4 0.01015 (ratio 1.51); MAE 0.0956 / 0.0804; physical error 2.24e-05 / 0; violation share 0.013 % (≈ 6 of 48,000 steps) / 0.000 %; training time 120 / 128 s. All values finite.
- Assistant check: Option 4's smallest `ĉ − δ` on the test set is 0.414, so its zero is not a rounding artefact. The whole notebook runs top to bottom with the cache filled.

### 2026-11-27 — Task 4.2 (section 8, Option 4 diagnostics)

- New Markdown ★ and code cell after the metrics: the five FR7.1 values from `EVAL["opt4"]`, the mean true `c` and the noise level of `c` (MAE 0.1·√(2/π) ≈ 0.0798) as references, then two interpretation lines generated from the values.
- Test set: mean δ −0.7890; mean |δ| 0.7903; max |δ| 1.7787; MAE of `ĉ` 0.7964; MAE of `ĉ − δ` 0.0804 (mean true `c` 1.5976). Interpretation printed: δ is not small (49 % of the mean consumption) and on average removes water; `ĉ − δ` tracks `c` at the noise level while `ĉ` alone is off by 0.796, so the consumption is recovered only as `ĉ − δ`. This is the identifiability issue foreseen in Phase A; 8E.1 tests the penalty on δ.
- The MAE of `ĉ − δ` equals the MAE of `m̂` in the main table (0.0804), as it must: the mass error of Option 4 is exactly the error of `ĉ − δ`. The whole notebook runs top to bottom with the cache filled.

### 2026-11-27 — Task 4.3 (section 8, comparison plots)

- New Markdown cell; the template's visual-comparison stub completed in place with `plot_comparison(results, data, seq=0, hours=168)`: 2 × 2 panels with shared hour axis, (a) true and predicted volume, (b) prediction error of both models, (c) `ĉ`, `ĉ − δ` and true `c`, (d) `δ`; grey zero lines in (b) and (d); titles, legends, light grid. Panel (c)'s legend is placed in one row above the curves (it hid data otherwise).
- Checked by looking at the figure: both predictions follow the volume closely; the baseline's largest error is at hour 0 (−0.58, no history yet); `ĉ − δ` follows the true `c` closely while `ĉ` stays between about 0.5 and 1.0; `δ` is close to 0 at the night minima of `c` and about −1.5 at the daily peaks, i.e. `δ` carries the daily peak of the consumption. The whole notebook runs top to bottom with the cache filled.

### 2026-11-27 — Task 4.4 (section 8, cold-spell table)

- New Markdown cell and code cell after the comparison plots: share of cold-spell test steps with `c = 0`, the true volume ranges (one extra printed line, added so the interpretation can cite them), and the table Baseline / Option 4 with MSE in-dist, MSE cold, x worse, physical error and violation share on the cold spell, from `evaluate(..., DATA_SHIFT, prefix="shift")` (no retraining; kept in `COLD`).
- Printed: 14.4 % of cold test steps have `c = 0`; true volume 88.8–250.3 in training, 149.5–568.4 on the cold test; Baseline MSE 0.01529 → 16966 (×1.11e+06), physical error 0.000588, violations 0.490 %; Option 4 MSE 0.01015 → 0.16477 (×16.2), physical error 0, violations 0.000 %.
- **Warning sign investigated** (assistant, not in the notebook): the baseline's cold MSE is extreme. Cause: with lower consumption the cold reservoirs keep filling, so the true volume leaves the training range (up to 568); the baseline's output is bounded (its predictions stay within 149.4–258.0), so its error grows along each sequence (mean |error| 0.25 in the first 24 h, 257 in the last 24 h; mean error −94, i.e. too low, which implies too much consumption and explains the few violations). The normalized temperature also leaves the training range (−4.73 to −0.38 vs −2.16 to 2.20). Option 4 obtains the volume from the balance: its `ĉ − δ` stays positive (minimum 0.106) and averages 1.07 against a true 0.87. The same order of magnitude was found by the earlier complex version (16,748), so this is a property of the design, not a wiring error. The cold test therefore combines two shifts: colder inputs and target volumes outside the training range; the interpretation (Task 4.5) must say so.
- The whole notebook runs top to bottom with the cache filled.

### 2026-11-27 — Task 4.5 (section 8, interpretation)

- One Markdown cell closing section 8, before the reflection questions: accuracy, physical consistency against the assignment's expected pattern, the `ĉ`/`δ` split, cost, the cold spell, and the scope of the evidence (one seed, one kind of shift).
- Differences from the expected pattern, stated with their reason: (1) the baseline's physical error is non-zero but tiny (2.24e-05, 0.013 % of steps), because in distribution it learned the boundary well; (2) Option 4 shows no violation on this test set, because the learned `δ` is mostly negative (mean −0.7890) and a violation needs `δ > ĉ`; the zero is presented as measured, not guaranteed; (3) `δ` is not the small correction the pattern assumes (49 % of the mean consumption): the consumption is split between `ĉ` and `−δ`, so the recovered consumption is `ĉ − δ`. The cold-spell paragraph states that the test combines colder inputs with volumes outside the training range (up to 568.4 vs 250.3).
- Verified automatically: every number cited appears in the notebook's outputs. The whole notebook (62 cells) runs top to bottom with the cache filled.

### 2026-11-27 — Task 5.1 (section 8E intro and 8E.1, penalty on δ)

- New section "8E. Extended experiments" between 8 and 9: intro Markdown (question → experiment table) and `print_table`; 8E.1 Markdown (loss, candidates, validation-only rule), the runs cell (`MU_RESULTS`), `select_mu` with the table and checks, the `ĉ` plot, and the interpretation. A short Markdown cell precedes the table and the plot cells (one before every code cell).
- Three new runs (`opt4_mu0.01_s112358`, `opt4_mu0.1_s112358`, `opt4_mu1.0_s112358`), ≈ 6.6 min in the assistant's workspace; cache files copied to `results/`.
- Results (validation MSE / test MSE / mean |δ| / MAE `ĉ` / MAE `ĉ − δ`): μ = 0: 0.00992 / 0.01015 / 0.7903 / 0.7964 / 0.0804; μ = 0.01: 0.00994 / 0.01015 / 0.0217 / 0.0844 / 0.0804; μ = 0.1: 0.00992 / 0.01015 / 0.0059 / 0.0808 / 0.0804; μ = 1.0: 0.00991 / 0.01013 / 0.0018 / 0.0803 / 0.0803. Physical error 0 for all. Threshold 0.01010 → chosen μ = 1.0 (Option 4-R).
- Interpretation: the penalty breaks the `ĉ`/`δ` tie at no accuracy cost because the simulated balance is complete; with an incomplete balance it would compete with accuracy (stated as not tested). Every number cited appears in the outputs (checked automatically; one derived percentage was rephrased to printed values). The whole notebook (71 cells) runs top to bottom with the cache filled.

### 2026-11-27 — Task 5.2 (8E.2, low-data ablation)

- New cells after 8E.1: Markdown, the runs cell (`LOW_DATA`, `LOW_RESULTS`; the 300 entries are the main runs), Markdown + table cell (`N_SIZES`, `LOW_EVAL`, FR9 checks), Markdown + two plots side by side (log–log test MSE with the 0.01 noise floor; violation share), interpretation.
- Eight new runs (`baseline_n{25,50,100,200}_s112358`, `opt4_n{…}_s112358`), ≈ 6.9 min in the assistant's workspace; cache files copied to `results/` (13 runs in total).
- Results (n = 25 / 50 / 100 / 200 / 300): test MSE baseline 6.30048 / 0.21744 / 0.03962 / 0.02204 / 0.01529; Option 4 0.01379 / 0.01108 / 0.01040 / 0.01025 / 0.01015; ratio 456.74 / 19.63 / 3.81 / 2.15 / 1.51; baseline violations 6.196 % / 0.535 % / 0.179 % / 0.077 % / 0.013 % (physical error 0.335 at 25); Option 4 0.000 % at every size.
- Checks: five points per model; validation and test arrays identical to `DATA`'s for every size; all values finite. Every decimal cited in the interpretation matches a printed value (checked automatically on whole tokens); one derived integer was removed. The whole notebook (78 cells) runs top to bottom with the cache filled.

### 2026-11-27 — Task 6.1 (section 9, reflection notes)

- One Markdown cell "Notes for question N" inserted between each question and its answer cell; the five `_Your answer:_ *(write here)*` cells are unchanged and empty.
- Q1: why MSE does not push to the physical side; baseline violations after convergence (0.013 %, 2.24e-05), with less data (6.196 % at 25) and on the cold spell (0.490 %, volumes up to 568.4 vs 250.3). Q2: soft vs hard; Option 4 in between (zero measured, mean δ −0.7890); where Option 2's `λ` term would go and how training and evaluation would change; 8E.1's `μ` term as a soft constraint on top of the hard structure. Q3: inductive bias; first-epoch losses 0.5097 vs 213 (section 7); the 8E.2 design and results (ratio 456.74 → 1.51; 0.01379 vs 6.30048 at 25). Q4: battery charge, building heat, inventory, compartment models, reactors; the identifiability caveat from 8E.1. Q5: temporal causality already structural in the LSTM; causal-parent inputs as the analogue of hard enforcement; why a causal constraint cannot be verified on outputs as conservation can.
- Checked automatically: every number cited appears in the notebook's outputs (the only non-matches were section numbers, list commas and "around 156", which rounds the printed `y_mean` 156.482). The whole notebook (83 cells) runs top to bottom with the cache filled.

### 2026-11-27 — Task 6.2 (section 11, final checks and checklist)

- The template's section 11 cell, which held both the pitfall list and the deliverables checklist, was split in two with its text unchanged; between them, a one-line Markdown cell and the final-checks code cell. The six FR11 checks run over all 13 runs in `RUNS`, reading each result back from `results/`; the output is the six "✓" lines and "All 6 checks passed.". Check 4 also verifies the validation history length (300) and that μ > 0 exactly in the `opt4_mu…` runs; check 6 also verifies that no run key equals `data_key`.
- Checklist ticked: every deliverable except "Written answers to all five reflection questions" (left for the user), including the low-data ablation plot.
- Verified that the checks can fail (scratch copy only): a batch that also carries `C`, a run with 299 recorded epochs, and a balance computed in normalized units each raise an `AssertionError`. The whole notebook (86 cells) runs top to bottom with the cache filled.

### 2026-11-27 — Task 6.3 (final review) — in progress, waiting for approval of the document edits

- **Fresh run:** `results/` deleted in the assistant's workspace (the old cache kept aside for comparison), then all 86 cells executed top to bottom: 13 runs "computed", every `assert` passed, "All 6 checks passed.", runtime **18.0 min** (2-core CPU, assistant's workspace).
- **Reproducibility:** every stored array of the 13 fresh runs is bit-identical to the earlier cache; only the wall-clock training times differ (by up to 17 s; baseline main run 120 → 137 s, Option 4 128 → 129 s).
- One sentence fixed as a consequence: the "Cost" paragraph of section 8's interpretation now cites the printed 129 s / 137 s and says that wall-clock times vary between executions by more than this difference.
- **Second run with the cache filled:** 13 runs "loaded from cache", none computed, 15 s, no error outputs. Every decimal cited in the section 7 conclusion, the section 8, 8E.1 and 8E.2 interpretations and the five sets of notes matches the final outputs (checked automatically).
- **In the user's folder:** the fresh notebook and the 13 cache files were copied back (same file names, overwritten; nothing deleted there). Run from the folder's copy in the folder's shell: 13 runs loaded from cache, none computed, all 6 checks passed, 42 s.
- `spec.md` §6: seven of eight criteria ticked; the last one ("`spec.md`, `architecture.md` and `tasks.md` describe the code that was written") waits for the user's approval of the edits proposed to them.

### 2026-11-27 — Task 6.3 closed (document edits decided by the user)

- The user noted that edits to the `.md` files are optional and chose three of the five proposed:
  - `spec.md` FR7.3 check: the true volume ranges of the training set and of the cold-spell test set are printed.
  - `architecture.md` §3: names added to "Names defined": `seq_ids` (4), `EVAL`, `COLD` (8), `MU_CHOSEN`, `N_SIZES`, `LOW_EVAL` (8E), `BUNDLES`, `STORED` (11).
  - `architecture.md` §4.7: the template's section 11 cell is split into the pitfall list and the checklist, with the final checks inserted between them.
- Not applied, by the user's decision; two known small differences between the documents and the code remain:
  - `spec.md` FR3 says the cold-spell test temperature is "exactly" 15 lower; in float32 it is equal within 1e-4 (that is what the notebook checks), with the same `r` and `q`.
  - `architecture.md` §4.5 does not mention that the implied consumption is computed in float32 in Option 4's order of operations, nor the extra volume-range line of the cold-spell table.
- Because of these two, the last acceptance criterion of `spec.md` §6 is left unticked; the other seven are ticked. All tasks in `tasks.md` are complete. Remaining for the user: the five written answers in section 9 (the last item of the deliverables checklist).
