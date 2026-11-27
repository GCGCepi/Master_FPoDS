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

- **Corrections on 2026-11-27.** The documents name the working folder `practical2/` (this folder is the template it is copied from). `spec.md`: Options 2 and 3 reference FR4.3; section 8 listed among the sections with `assert` checks; FR7.1 states every use of `C`; FR7.3 lists the "times worse" column; log–log axes in FR5.5. `architecture.md` and `tasks.md` no longer refer to "the simple version" (it does not exist in the working folder); `LOW_DATA` added to the names of section 8E.

## 5. Implementation

(Entries added by the assistant as tasks are completed.)

**2026-11-27 — all tasks (0.1–6.3) implemented in one pass.** The user asked for the whole job to be done without stopping between tasks (an explicit instruction that overrides the "wait for confirmation" rule of `aiRules.md` §3 for this session). The notebook could not run on the user's machine (no JAX in its shell), so it was built and run in the assistant's workspace and copied back with its outputs and `results/`.

Decisions taken while implementing (none changes the design):

- **Tasks 3.1–3.2** were verified in a temporary copy of the notebook, never in the delivered one: a 3-epoch baseline run gave 3 finite training and validation values (train 90.8 → 4.82, validation 21.8 → 2.67), the returned parameters reproduced the lowest validation MSE (epoch 3), and a batch held exactly `xn`, `x`, `y`; a 2-epoch Option 4 run returned every key of `architecture.md` §4.4 with test and cold-spell predictions of shape (100, 480), and a second call loaded identical arrays from the cache. The temporary `.npz` and `RUNS` entry were deleted.
- **Stored fields.** Each cached run also stores `kind` and `mu`, so that check 4 of section 11 reads the settings back from `results/` instead of trusting `RUNS`. Recorded in `architecture.md` §4.4.
- **Plot labels.** `LABELS` and `COLORS` (section 7) are shared by every plot and table; added to `architecture.md` §3.
- **Reflection notes** are placed in their own Markdown cell between each question and its untouched answer cell (`architecture.md` §3).
- **Cold-spell table.** The "x worse" column is printed with 3 significant digits, because the baseline's ratio is of order 10⁶.
- **Sanity plot / checks.** `day_year_norm` and `hour_norm` stay in [0, 1) in float32; the generated volume stays between 80.3 and 250.3, and `c` between 0.151 and 3.011 in the main data.

Headline numbers (seed 112358, test set unless stated):

| | Baseline | Option 4 |
| --- | --- | --- |
| Best epoch (validation MSE) | 273 (0.01309) | 271 (0.009917) |
| Test MSE / MAE | 0.01474 / 0.09348 | 0.01015 / 0.08037 |
| Physical error / violation share | 5.15e-05 / 0.021 % | 0 / 0 % |
| Cold spell MSE (× in-distribution) | 1.698e+04 (1.15e+06) | 0.1648 (16.2) |

- Option 4 diagnostics: mean δ −0.789, mean │δ│ 0.790 (98 % of mean ĉ), MAE of ĉ 0.796, of ĉ − δ 0.0804 (noise level 0.080). The physical error of Option 4 is 0, which differs from the assignment's expected pattern; the notebook explains it (δ is negative, which moves the implied consumption away from zero).
- 8E.1: chosen μ = 1 (validation MSE 0.009906, threshold 0.0101); mean │δ│ 0.0018 and MAE of ĉ 0.0803 with no loss of accuracy.
- 8E.2: MSE ratio baseline / Option 4 = 454.9, 20.9, 3.7, 2.1, 1.5 for 25, 50, 100, 200, 300 sequences; the baseline violates the balance on 6.177 % of steps at 25, Option 4 never.

**Task 6.3 — final review.** With `results/` deleted, "run all" took 12 min 49 s on a 2-core CPU (13 training runs) with every `assert` passing; all 13 cached results were bit-identical to those of a first full run, apart from the wall-clock times. With the cache filled the notebook re-runs in 22 s and loads all 13 runs without retraining. Because the training times of the final run differ from the first one (baseline 103.3 s, Option 4 96.9 s), the interpretation of section 8 and the notes of question 2 cite the final values and no longer claim a cost for Option 4. `spec.md` §6 and `tasks.md` are ticked; `architecture.md` updated as noted above.
