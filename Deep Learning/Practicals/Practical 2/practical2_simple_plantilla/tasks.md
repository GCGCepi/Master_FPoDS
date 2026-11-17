# Tasks

One task at a time (see `aiRules.md`). Each task completes one or more `TODO` cells of `A1_Phase_B_Individual_Exercise.ipynb`, with a Markdown cell before each code cell; mark it `[x]` when its check passes. Markdown follows `spec.md`: 2–4 lines for simple steps, up to about 8 lines for the key concepts (marked ★ below). Names and shapes follow `architecture.md`.

## Phase 0 — Setup
- [ ] **0.1** Run the environment cell and the JAX/Flax demo cells (sections 0–1) unchanged. *Check: versions printed; `f'(2) = 14.0`; the MLP demo's loss goes down.*

## Phase 1 — Data (section 4)
- [ ] **1.1** ★ `generate_data` (the mass balance, why `c` is clipped, one sub-key per random quantity). *Check: shapes (400, 480, 6) / (400, 480) / (400, 480); `C ≥ 0`; `m > 0`; balance residual < 1e-3; same key, same data.*
- [ ] **1.2** Sanity-check plot of one sequence: mass on top, `r`, `q`, `c` below. *Check: plot visible; the daily cycle of `c` can be seen.*
- [ ] **1.3** ★ Split by sequence and normalize (`x_mean`, `x_std`, `norm_x`, `Xn_tr`, `Xn_te`, `y_mean`, `y_std`; why by sequence, why training statistics only, why the raw values are kept). *Check: shapes (300, 480, 6) / (100, 480, 6); normalized training inputs have mean ≈ 0 and std ≈ 1.*

## Phase 2 — Models (sections 5–6)
- [ ] **2.1** ★ `LSTMBackbone`, `ConventionalLSTM`, `conv_model`, `conv_params`, `predict_baseline` (what the LSTM sees at step `t`, why the output is scaled). *Check: output shape (2, 480) on two training sequences; 5,025 parameters.*
- [ ] **2.2** ★ `ResidualCorrectionLSTM`, `res_model`, `res_params` (the two heads, `softplus`, the balance in raw units, what `δ` is allowed to do). *Check on two training sequences, untrained: three outputs of shape (2, 480); 5,058 parameters; `c_hat > 0`; `m_pred` equals `m + r − q − c_hat + delta` within 1e-3.*

## Phase 3 — Training (section 7)
- [ ] **3.1** ★ `train_model`, `conv_loss`, `res_loss` (mini-batches of sequences, reshuffling with split keys, the jitted step, why `C` appears in neither loss). *Check: a 2-epoch trial run of each model gives finite, decreasing losses; the trial parameters are discarded.*
- [ ] **3.2** Train the baseline for 300 epochs, timed. *Check: last-epoch loss lower than the first; time printed.*
- [ ] **3.3** Train Option 4 for 300 epochs with the same settings, timed. *Check: last-epoch loss lower than the first; time printed.*
- [ ] **3.4** Both training-loss curves on the same log-scale axes. *Check: plot visible, labelled.*

## Phase 4 — Evaluation (section 8)
- [ ] **4.1** ★ `compute_metrics` and the comparison table on the test set: MSE, MAE, physical error, share of violating steps, training time (what the physical error measures, why it is one-sided). *Check: all values finite; Option 4 MSE lower than the baseline's; a short reading of the table against the expected pattern.*
- [ ] **4.2** ★ Option 4 diagnostics: mean and maximum `│δ│`, MAE of `ĉ` and of `ĉ − δ` against `C_te` (why only `ĉ − δ` is identified). *Check: values printed; interpretation cites them.*
- [ ] **4.3** Plots on one test sequence: prediction error of both models; `ĉ`, `ĉ − δ` and the true `c`; `δ`. *Check: plots visible, labelled.*

## Phase 5 — Reflection and final check (sections 9–11)
- [ ] **5.1** A notes list under each of the five reflection questions (numbers from this notebook plus the key points). The answer cells stay empty. *Check: five lists; every number matches the notebook's output.*
- [ ] **5.2** The pitfall asserts (R12), the deliverables checklist ticked (the optional ablation stays unticked), then "Restart and run all" and save with outputs. *Check: asserts pass; every requirement in `spec.md` met.*
