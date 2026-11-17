# Specification — Conservative neural networks with JAX (Phase B)

## Goal

Complete the notebook `A1_Phase_B_Individual_Exercise.ipynb` (a copy of the provided template). It simulates a water reservoir, trains two recurrent models on the same data, and compares them on **prediction accuracy** and **physical consistency**:

- **Baseline (Option 1):** a conventional LSTM that predicts the next mass `m̂(t+1)` directly.
- **Our model (Option 4, residual correction):** an LSTM that predicts the hidden consumption `ĉ(t) ≥ 0` and a correction `δ(t)`; the mass is computed from the balance, `m̂(t+1) = m(t) + r(t) − q(t) − ĉ(t) + δ(t)`.

The choice of Option 4 and its plan come from Phase A (`../A1_Phase_A_Group_Exercise.ipynb`, Discussions 3 and 4). The point is not the lowest error: it is to measure what building the conservation law into the architecture buys.

**The system.** Hourly steps, exact mass balance `m(t+1) = m(t) + r(t) − q(t) − c(t)`, with `c(t) ≥ 0` hidden. Models see `x(t) = [m, r, q, temp, hour_norm, day_year_norm]` and predict `m(t+1)`.

**Allowed:** `jax`, `flax.linen`, `optax`, `numpy`, `matplotlib`, `time`. **Not allowed:** other deep learning frameworks; the true `c(t)` as a model input or a training target.

## Requirements

Each requirement has a check, printed or asserted in the notebook.

| ID | Requirement | Check |
| --- | --- | --- |
| R1 | `generate_data(key, n_seq=400, T=480)` simulates the reservoir and returns `X` (features in the order `[m, r, q, temp, hour_norm, day_year_norm]`), `Y = m(t+1)` and `C` (true consumption, diagnostics only). | Shapes (400, 480, 6), (400, 480), (400, 480). `C ≥ 0`; `m > 0`; `max│Y − (m + r − q − C)│ < 1e-3`; the same key gives the same data. |
| R2 | A sanity-check plot of one simulated sequence: the mass, and the flows `r`, `q`, `c`. | Plot visible, with labels and legend. |
| R3 | Split **by sequence**: the first 300 sequences are train, the last 100 are test. Input statistics (`x_mean`, `x_std`) and target statistics (`y_mean`, `y_std`) come from the **training split only**. The raw `m, r, q` are kept. | Shapes (300, 480, 6) / (100, 480, 6). Normalized training inputs have mean ≈ 0 and std ≈ 1 per feature (tolerance 1e-3). |
| R4 | Baseline: `LSTMBackbone` → `Dense(1)`, as in the template. Its output is mapped to physical units with the fixed training statistics: `m̂ = y_mean + y_std · output`. | Output shape (batch, 480); 5,025 parameters. |
| R5 | Option 4: `ResidualCorrectionLSTM` returns `(m_pred, c_hat, delta)`; `c_hat` goes through `softplus`; `delta` has no constraint; the balance uses the **raw** `m, r, q`. | Three outputs of shape (batch, 480); 5,058 parameters; `c_hat > 0`; `max│m_pred − (m + r − q − c_hat + delta)│ < 1e-3`. |
| R6 | Both models are trained under identical settings: MSE on `m(t+1)` in physical units, Adam (learning rate 1e-2), hidden size 32, 300 epochs, mini-batches of 32 sequences reshuffled every epoch with a freshly split key, a `jax.jit` training step. Training time is recorded. Neither loss uses `C`. | For each model the last-epoch loss is lower than the first-epoch loss; both times are printed. |
| R7 | The two training-loss curves on the same axes, log scale. | Plot visible, with labels and legend. |
| R8 | On the **test set**, for both models: MSE, MAE, physical error `mean(max(0, −(m + r − q − m̂)))`, the share of time steps with negative implied consumption, and training time, in one table. | All values finite. Option 4 has a lower MSE than the baseline. The physical-error pattern is reported against the expected one (baseline non-zero; Option 4 not guaranteed zero). |
| R9 | Option 4 diagnostics on the test set: mean and maximum of `│δ│`, the MAE of `ĉ` against the true `c`, and the MAE of the effective consumption `ĉ − δ` against the true `c`. This is the only place `C` is used. | Values printed, with a short interpretation that cites them. |
| R10 | Plots on one test sequence: prediction error `m̂(t+1) − m(t+1)` of both models; `ĉ(t)`, `ĉ(t) − δ(t)` and the true `c(t)`; `δ(t)`. | Plots visible, with labels and legends. |
| R11 | Under each of the five reflection questions, a bullet list of **notes**: the numbers from this notebook and the key points that answer the question. The answer cells themselves stay empty for the user to write. | Five note lists; every number cited appears in the notebook's output. |
| R12 | A final cell re-checks the common pitfalls with asserts, and the deliverables checklist is ticked. | Asserts pass: 6 input features and no `C` in any batch; train and test are disjoint sequence ranges; statistics computed on the training split; both models share hidden size, optimizer, epochs and batch size. |

## Constraints

- The template's section order, class names and function signatures are kept. `TODO` stubs are completed in place. The Option 2 and Option 3 stubs stay as they are (not used).
- Every random number comes from a key derived from `jax.random.PRNGKey(112358)` by splitting (the template's `PRNGKey(42)` in section 4 is replaced; the demo cells of section 1 keep their own keys). No key is used twice.
- The notebook runs top to bottom ("Restart and run all") on CPU in under 10 minutes.
- Each code cell is preceded by a Markdown cell: 2–4 lines for simple steps, up to about 8 lines for the key concepts (marked ★ in `tasks.md`).
- Everything in English.
