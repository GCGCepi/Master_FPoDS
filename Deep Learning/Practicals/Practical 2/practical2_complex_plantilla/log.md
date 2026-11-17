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
