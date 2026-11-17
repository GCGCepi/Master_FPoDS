# Log

## 2026-11-16
- Phase A written in `../A1_Phase_A_Group_Exercise.ipynb`. Chosen model: **Option 4 (residual correction)**, compared against the baseline (Option 1).
- Wrote `spec.md`, `architecture.md`, `tasks.md`, `aiRules.md` for the simple version: the minimum the assignment asks for. `A1_Phase_B_Individual_Exercise.ipynb` is an unmodified copy of the template.
- Decisions taken from a quick prototype of the design (details in `architecture.md`):
  - Inflow `r ~ U[2.35, 3.85]` and `m(0) = 150 + U[0, 10]` instead of the template's example values, which drive the volume negative.
  - The baseline's output is scaled with the training target statistics; without it the baseline does not converge in 300 epochs.
  - Option 4 is trained with the plain MSE, as the assignment states; the diagnostics report `δ` and the effective consumption `ĉ − δ`, because `ĉ` and `δ` are not separately identified.
- Reflection questions: the assistant provides notes only; the answers are written by the user.
- The optional low-data ablation is not part of this version.

## 2026-11-17
- Seed changed from 42 to **112358** (`spec.md`, `architecture.md`). The expected results in `architecture.md` come from a prototype run with seed 42.
- Tasks 0.1–5.2 done in one run (test run, no stops). The notebook was executed top to bottom in a Linux CPU workspace (2 cores; total ≈ 2 min 45 s) and copied back with outputs; training times in the table come from that machine.
- Phase 0: the `%pip install` line in section 0 is active although its comment says "Uncomment if needed"; left unchanged as the task says.
- Task 3.1 decision: each epoch uses 9 full batches of 32 sequences; the remaining 12 sequences of each permutation are dropped (different ones every epoch). This keeps all batches at exactly 32 and one compiled step shape per model.
- Results (seed 112358, test set): MSE baseline 0.0169 / Option 4 0.0100; MAE 0.0948 / 0.0800; physical error 4.74e-05 (0.017 % of steps) / 0 (0 %); training time 69.1 s / 76.0 s. All checks and the final asserts pass.
- Differences from the prototype in `architecture.md` (seed 42): the baseline is better here (MSE 0.017 vs ≈ 0.056) and its training loss shows late spikes (around epochs 170 and 255). `δ` is not a constant offset: it carries most of the daily cycle (mean −0.757, max │δ│ 1.654, slightly positive at the daily minima), and `ĉ` is a flattened copy of the cycle (MAE of `ĉ` 0.763). `ĉ − δ` matches the true `c` with MAE 0.080, as expected. This is the identifiability issue, not a wiring error.
- Reflection: notes added under the five questions; the answer cells are empty for the user. Checklist ticked except the optional ablation and "Written answers" (still to write).
