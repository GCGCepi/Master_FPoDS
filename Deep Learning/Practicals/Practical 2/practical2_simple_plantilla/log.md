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
