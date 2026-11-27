# Project tasks — Practical 2: Conservative neural networks with JAX (Phase B)

Rules:

- **One task at a time**, in order, following `aiRules.md`. After each task, mark it `[x]` and wait for the user's confirmation.
- Each task completes cells of `A1_Phase_B_Individual_Exercise.ipynb` in the section named: a Markdown cell explaining the block, then the code cell(s). Names, signatures and shapes follow `architecture.md`; FR numbers refer to `spec.md`.
- After every task, **"Restart kernel and run all" must work**. Stubs of later tasks stay as the template left them.
- Each task has a **Check**. In sections 4–6, 8, 8E and 11 it is written in the code cell as `assert` statements after printing the values involved. Section 7 has no checks in the notebook (see tasks 3.1–3.2).
- Mark ★ = key concept: up to about 10 lines of Markdown. Otherwise 2–4 lines.

## Phase 0 — Setup

- [x] **0.1** Run sections 0–1 unchanged.
  - Check: versions printed; `f'(2) = 14.0`; the MLP demo's loss goes down.
- [x] **0.2** ★ Section 4.0: `import os, zlib`, `CONFIG`, `run_key`, `data_key` (replacing the template's `PRNGKey(42)`), `results/`.
  - Check: FR1.

## Phase 1 — Data (section 4)

- [x] **1.1** ★ Section 4.1: `generate_data` (with `temp_shift`).
  - Check: FR2.1.
- [x] **1.2** Section 4.2: the three-panel sanity plot.
  - Check: FR2.2.
- [x] **1.3** ★ Section 4.3: `make_dataset`, `DATA`, `DATA_SHIFT` (split by sequence, training statistics, raw values kept, why the shifted set reuses `DATA`'s statistics).
  - Check: FR3.

## Phase 2 — Models (sections 5–6)

- [x] **2.1** ★ Section 5: `LSTMBackbone`, `ConventionalLSTM`, `n_parameters`, and the hidden-state check, in one cell.
  - Check: FR4.1.
- [x] **2.2** Section 6: replace the template's Option 2 and Option 3 cells (Markdown and stub code) with one short Markdown note each (FR4.3).
  - Check: no `SoftConstraintLSTM` or `ConservativeLSTM` code and no `TODO` left in section 6; each note says why the option was not chosen.
- [x] **2.3** ★ Section 6: `ResidualCorrectionLSTM` and its untrained check.
  - Check: FR4.2.
- [x] **2.4** Section 6, own cell: `build_model` for `"baseline"` and `"option4"`.
  - Check: FR4.4.

## Phase 3 — Training (section 7)

- [x] **3.1** ★ Training functions in one cell: optimizer with clipping, `make_batch`, `make_loss_fn`, `make_val_fn`, `train_model`. The Markdown before it explains mini-batches of sequences, reshuffling with split keys, clipping, best-epoch selection and why `C` is in no batch.
  - Verify (assistant, not left in the notebook): a temporary 3-epoch run of the baseline gives 3 finite training and validation values, the returned parameters have the lowest of the 3 validation MSEs, and a batch has exactly the keys `xn`, `x`, `y`. Delete the temporary cell; report the numbers.
- [x] **3.2** `run_experiment`, `run_cached`, `RUNS`.
  - Verify (assistant, not left in the notebook): a temporary 2-epoch run returns the keys of `architecture.md` §4.4 with test predictions of shape (100, 480), and a second call loads identical arrays from the cache. Delete the temporary cell, its `.npz` and its `RUNS` entry.
- [x] **3.3** Main runs: `baseline_s112358` and `opt4_s112358`, both with `eval_sets={"shift": DATA_SHIFT}`.
  - Check (in the report): two output lines only; both runs computed.
- [x] **3.4** `plot_losses` with one printed line per model, then the conclusion Markdown cell of section 7.
  - Check (in the report): FR5.5; no value appears twice in section 7's output; the conclusion cites the printed numbers.

## Phase 4 — Metrics and comparison (section 8)

- [x] **4.1** ★ Metrics and the main table (metric rows × model columns, then the "Reading" lines).
  - Check: FR6.
- [x] **4.2** ★ Option 4 diagnostics.
  - Check: FR7.1 values printed; the interpretation lines match them.
- [x] **4.3** `plot_comparison` (four panels, first week of test sequence 0).
  - Check: FR7.2.
- [x] **4.4** Cold-spell table.
  - Check: FR7.3.
- [x] **4.5** Interpretation of section 8 (Markdown).
  - Check: every number cited is in the outputs; differences from the assignment's expected pattern are stated with a reason.

## Phase 5 — Extended experiments (section 8E)

- [x] **5.1** Section 8E intro and `print_table`; 8E.1 penalty on δ: three runs, `select_mu`, table, plot, interpretation.
  - Check: FR8.
- [x] **5.2** 8E.2 low-data ablation: eight runs, table, two plots, interpretation.
  - Check: FR9.

## Phase 6 — Reflection and final checks

- [x] **6.1** Notes under each of the five reflection questions; the answer cells stay empty.
  - Check: FR10.
- [x] **6.2** Section 11: the final-checks cell with the short output; tick the deliverables checklist (including the low-data ablation, not the written answers).
  - Check: FR11.
- [x] **6.3** Final review: delete `results/`, "Restart kernel and run all", note the runtime; tick `spec.md` §6; check that `spec.md` and `architecture.md` match the code; update `log.md`.
  - Check: every criterion ticked; outputs saved; a second run with the cache filled retrains nothing.
