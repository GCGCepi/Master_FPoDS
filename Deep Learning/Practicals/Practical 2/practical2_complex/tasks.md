# Project tasks — Practical 2: Conservative neural networks with JAX (Phase B)

Rules:

- Do **one task at a time**, in order, following `aiRules.md`. After each task, mark it `[x]` and wait for the user's confirmation.
- Each task completes `TODO` cells of `A1_Phase_B_Individual_Exercise.ipynb` or adds cells in the section named: a Markdown cell explaining the block, then the code cell(s).
- **After every task, "Restart kernel and run all" must work** with no errors. Stubs of later tasks stay as the template left them (they only raise if called).
- Each task has a **Check**, written in the code cell as `assert` statements with a message, after printing the values involved. The task is done only when the asserts pass.
- Function names, signatures and shapes follow `architecture.md`; requirement IDs (FR) refer to `spec.md`.
- Tasks that train print one line per run saying whether it was computed or loaded from the cache, and its training time.
- Any change to the plan is recorded in `log.md`.

## Phase 0 — Setup

- [x] **0.1** Run sections 0–1 unchanged (environment, JAX demo, MLP demo).
  - Check: versions and devices printed; `f'(2) = 14.0`; the MLP demo's loss goes down.
- [x] **0.2** First cell of section 4: `import os, zlib`, `CONFIG` (seed 112358), the empty `RUN_NAMES`, `data_key` (replacing the template's `PRNGKey(42)`), and the creation of `results/`.
  - Check: the configuration is printed; `n_train + n_val + n_test == n_seq`; `results/` exists.

## Phase 1 — Data (FR1, FR2)

- [x] **1.1** `generate_data` with `unmetered_inflow` and `temp_shift`.
  - Check: FR1.1–FR1.3 (shapes, `C ≥ 0`, `m > 0`, ranges, balance residual < 1e-3, consecutive steps consistent, same key → same data, another key → different data). Also: with `unmetered_inflow=1.0` the residual of `Y − (m + r − q − C)` is 1.0 within 1e-3.
- [x] **1.2** Sanity-check plot of one sequence: mass; flows `r`, `q`, `c`; temperature.
  - Check: three labelled panels; the printed range of `m`, `c` and the temperature.
- [x] **1.3** `make_dataset`, `DATA` and `DATA_SHIFT`: split by sequence, statistics from the training split, normalized inputs; the shifted bundle reuses `DATA`'s statistics.
  - Check: FR2.1–FR2.2 (shapes, disjoint ranges, normalized training mean ≈ 0 and std ≈ 1, statistics differ from full-data statistics); `make_dataset(data_key, n_train=25)` has 25 training sequences and the same validation and test arrays as `DATA`; `DATA_SHIFT` has the same `x_mean` as `DATA`, a test temperature about 15 lower, and the printed share of test steps with `c = 0`.

## Phase 2 — Models (FR3)

- [x] **2.1** `LSTMBackbone` and `ConventionalLSTM`.
  - Check: hidden states (2, 480, 32); output (2, 480); 5,025 parameters.
- [x] **2.2** `ResidualCorrectionLSTM` (Option 4).
  - Check: FR3.2 on untrained parameters.
- [x] **2.3** `ConservativeLSTM` (Option 3, for the ablation). Leave `SoftConstraintLSTM` untouched.
  - Check: FR3.3 on untrained parameters (uses a few lines of metric arithmetic inline; `compute_metrics` comes in 4.1).
- [x] **2.4** `build_model`: the uniform `(model, init_fn, predict_fn)` interface for the three kinds, with the baseline's output scaling.
  - Check: for each kind, `predict_fn` returns `m_pred` of shape (2, 480) in physical units (untrained baseline predictions have mean within 2 · `y_std` of `y_mean`); `output_scaling=False` returns the raw output.

## Phase 3 — Training (FR4)

- [x] **3.1** The optimizer with gradient clipping; `train_model` with mini-batches, validation, best-epoch selection, history and the `NaN` stop.
  - Check: a 3-epoch trial of the baseline: 3 training and 3 validation values, all finite; 10 batches per epoch, the last of 12 sequences; the validation MSE of the returned parameters equals the lowest of the 3 recorded values; a loss function that returns `NaN` raises the FR4.6 message.
- [x] **3.2** `run_experiment` and `run_cached`.
  - Check: a 2-epoch trial run named `"trial_s112358"` (`epochs=2`) returns every key listed in `architecture.md` §4.4, with test predictions of shape (100, 480); calling it again loads from `results/trial_s112358.npz` and gives identical arrays; the same name with different arguments raises `ValueError`. Delete `results/trial_s112358.npz` and the `RUN_NAMES` entry of the trial at the end of the cell.
- [x] **3.3** Train the two main models (`baseline_s112358`, `opt4_s112358`), 300 epochs each, with `eval_sets={"shift": DATA_SHIFT}`.
  - Check: the FR4 check (last training loss below the first, 300 values, best epoch printed); both training times printed.
- [x] **3.4** `plot_losses` for the two main runs.
  - Check: training and validation curves, log scale, best epochs marked, legend.

## Phase 4 — Metrics and main comparison (FR5, FR6)

- [x] **4.1** `compute_metrics`, `violation_rate`, `evaluate`.
  - Check: FR5.1 on hand-made arrays; the violation rate of those arrays is 0, 1 and 0.
- [x] **4.2** `naive_references`, `print_table` and the main table.
  - Check: FR6.1.
- [x] **4.3** `plot_comparison` on one test sequence (four panels).
  - Check: four labelled panels with legends.
- [x] **4.4** Markdown interpretation of the main comparison, including the `ĉ` / `δ` identifiability result.
  - Check: every number cited is in the table; the text follows `architecture.md` §7 "Read this before writing any interpretation".

## Phase 5 — Extended experiments (FR7–FR12), in section 8E

- [x] **5.1** Penalty on δ: three runs (with `eval_sets={"shift": DATA_SHIFT}`), `select_mu` over the four candidates, table, plot, interpretation.
  - Check: FR7.
- [x] **5.2** Ablations: `opt3_s112358` and `baseline_raw_s112358` (with `eval_sets={"shift": DATA_SHIFT}`), table, interpretation.
  - Check: FR8 (the comparison with the seed spread is completed in 5.3).
- [x] **5.3** Seeds: `baseline` and `opt4` for seeds 112359 and 112360, mean ± std table, interpretation; complete the sentence left open in 5.2.
  - Check: FR9.
- [x] **5.4** Low-data ablation: eight runs (no `eval_sets`), table, two plots, interpretation.
  - Check: FR10.
- [x] **5.5** Distribution shift: table from the stored `shift_…` predictions of `baseline`, `opt4`, Option 4-R and `opt3`, plot, interpretation.
  - Check: FR11.
- [x] **5.6** Incomplete physics: `DATA_INC`, two runs (no `eval_sets`), table with the true-data row, interpretation.
  - Check: FR12.

## Phase 6 — Reflection and final checks (FR13, FR14, spec §7)

- [x] **6.1** Notes under each of the five reflection questions. The answer cells stay empty.
  - Check: FR13.
- [x] **6.2** The pitfall asserts in section 11; tick the notebook's deliverables checklist (including the low-data ablation).
  - Check: FR14.
- [x] **6.3** Final review: delete `results/`, "Restart kernel and run all", record the total runtime, tick the acceptance criteria in `spec.md` §7, check that `spec.md` and `architecture.md` match the code, update `log.md`.
  - Check: every criterion ticked; the notebook saved with all outputs visible; a second run with the cache filled finishes in under 3 minutes.
