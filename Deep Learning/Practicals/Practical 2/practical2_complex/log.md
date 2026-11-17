# Log

## 2026-11-16
- Phase A written in `../A1_Phase_A_Group_Exercise.ipynb`. Chosen model: **Option 4 (residual correction)**, compared against the baseline (Option 1).
- Wrote `spec.md`, `architecture.md`, `tasks.md`, `aiRules.md` for the complex version: the assignment's deliverables plus six experiments that test the Phase A plan. `A1_Phase_B_Individual_Exercise.ipynb` is an unmodified copy of the template.
- Decisions taken from prototypes of the design (numbers in `architecture.md` §7):
  - Inflow `r ~ U[2.35, 3.85]` and `m(0) = 150 + U[0, 10]` instead of the template's example values, which drive the volume negative.
  - 450 sequences (300 train, 50 validation, 100 test), so model selection never touches the test set.
  - The baseline's output is scaled with the training target statistics; without it the baseline does not converge in 300 epochs. The unscaled version is kept as an ablation.
  - Gradient clipping (global norm 1.0) and best-epoch selection on validation for every model.
  - Option 4 leaves `ĉ` and `δ` unidentified under the plain MSE. The main model stays as the assignment defines it; a penalty on `δ`, with `μ` chosen on validation, is an experiment.
  - A well-trained baseline almost never violates the balance on the in-distribution test set with this data. The low-data, distribution-shift and incomplete-physics experiments were added to show where the difference between the models appears.
- Left out on purpose: Option 2, other recurrent architectures, dropout, learning-rate schedules, free-running forecasts.
- Reflection questions: the assistant provides notes only; the answers are written by the user.

## 2026-11-17
- Base seed changed from 42 to **112358**; the repeated-seed experiment uses 112358, 112359, 112360. Run names now end in `_s112358`. The main pair was re-prototyped with the new seed (`architecture.md` §7).
- Consistency review of the documents. Fixed:
  - `DATA_SHIFT` is built in section 4 (task 1.3), and every run trained on the full `DATA` evaluates on it; before, only some runs did, although Option 4-R is not known until the `μ` runs finish.
  - `build_model` belongs to section 6 (it was listed under section 7).
  - Extra imports go in the first cell of section 4, so sections 0–3 really stay unchanged.
  - `run_experiment` takes `epochs`, needed by the short trial runs of tasks 3.1–3.2.
  - The final raw-units check uses the stored predictions (trained parameters are not kept).
  - `μ = 0` is one of the four candidates of the selection rule.
  - Dataset bundles carry a `tag`, so `RUN_NAMES` can record what each run was trained on; the baseline's results have no `c_hat` / `delta` entries.
  - The balance is written `((m + r) − q) − ĉ + δ` everywhere; the mean of `δ` is listed among the metrics; the FR4 check has its own line.
- Start of implementation (decisions taken with the user before task 0.1):
  - The assistant runs the notebook itself, in its own workspace, and copies the notebook and the documents back to this folder after each task.
  - The Phase A notebook is in this folder, not in the parent folder: path corrected in `aiRules.md`, `spec.md` and `architecture.md` §1.
  - The 3-epoch trial of task 3.1 gets its key with the same rule as every run (seed + name, `architecture.md` §4.0), with the name `"trial31_s112358"`.
  - `train_model` keeps the template's signature and uses the global `optimizer` defined in section 7; its docstring says so.
  - Task 3.2 also removes the trial from `RUN_NAMES` (one line), so the FR14 check of identical hyperparameters does not see its 2 epochs. `tasks.md` updated.
  - The `.npz` cache is kept as specified; the files do not store their arguments (delete `results/` after changing the code).
  - This is a test run: the user asked the assistant to do every task in order without stopping after each one, unless a question comes up.
- Implementation of all tasks (0.1–6.3), run by the assistant in its own environment (JAX 0.12.0.1, Flax 0.12.12, Optax 0.2.9; CPU, 2 cores).
  - Small additions to the documented design, now in `architecture.md`: helper `run_key` (section 4; also gives the keys of trials and untrained-model checks), `n_parameters` (section 5), `make_loss_fn` / `make_val_fn` (section 7, so the trial of 3.1 and `run_experiment` share them), `metrics_of` (section 8); `history` also records the batch sizes and batch keys of one epoch, and each run stores its `batch_keys` (used by the FR3.4 / FR14 checks); `run_cached` takes the same explicit arguments as `run_experiment`.
  - Comparison plots and the `c_hat` plots show the first week (168 h) of a test sequence, so the daily cycle is readable. The shift plot uses the test sequence with the most steps at `c = 0` (sequence 38).
  - FR14 split check: sequences are identified by their first 5 volumes; `m(0)` alone repeated by chance in float32.
  - Headline numbers (test set, seed 112358): persistence MSE 0.75844, constant consumption 0.48248; baseline MSE 0.01427, MAE 0.0909, physical error 0.00006, violations 0.027 %, 63.3 s; Option 4 MSE 0.01015, MAE 0.0804, physical error 0, violations 0, 68.0 s; Option 4 MAE of `c_hat` 0.7964, of `c_hat − delta` 0.0804, mean delta −0.789.
  - 8E.1: all four `mu` within 2 % on validation, chosen `mu = 1.0` (Option 4-R): mean |delta| 0.0018, MAE of `c_hat` 0.0803, test MSE 0.01013. 8E.2: Option 3 MSE 0.01015, physical error exactly 0; unscaled baseline MSE 282.10, violations 50.4 %. 8E.3: baseline 0.01454 ± 0.00024, Option 4 0.01015 ± 0.00001. 8E.4: MSE ratio 453.5 at 25 sequences, 1.4 at 300. 8E.5: baseline MSE 16748 on the cold spell, Option 4 / 4-R / 3: 0.165 / 0.138 / 0.133, no violations for any of them. 8E.6: Option 3 MSE 0.03219, Option 4 0.01016; physical error of the true data 0.0732.
  - Differences from `architecture.md` §7 (reported in the interpretations): the baseline is not at zero violations in distribution (0.027 %); `mu = 1.0` chosen instead of 0.1 (seed 42 prototype); Option 4 has no violations on the shifted set (prototype ≈ 0.1 %); low-data baseline at 25 sequences 6.26 instead of ≈ 1.1. None changes a direction.
  - Final run with `results/` deleted: 1121 s (18.7 min), every assert passed, numbers identical to an earlier full run (only training times differ by a few seconds). Second run with the cache filled: 19 s.
  - The last item of the notebook's deliverables checklist (written answers to the reflection questions) is left unticked: the answers are the user's to write.
