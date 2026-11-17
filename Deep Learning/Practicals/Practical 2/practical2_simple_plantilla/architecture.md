# Architecture

## Files

```
Practical 2/
├── A1_Phase_A_Group_Exercise.ipynb          # Phase A: the plan (already written)
└── practical2_simple/
    ├── spec.md, architecture.md, tasks.md, aiRules.md, log.md
    └── A1_Phase_B_Individual_Exercise.ipynb  # copy of the template; all the code goes here
```

The notebook keeps the template's sections. Sections 0–3 (environment, JAX/Flax introduction, background, scenario) are left unchanged.

## Models

```
Baseline (Option 1)
xn (B, 480, 6) ─► LSTM(32) ─► h (B, 480, 32) ─► Dense(1) ─► o (B, 480) ─► m̂ = y_mean + y_std · o

Option 4 (residual correction)
xn (B, 480, 6) ─► LSTM(32) ─► h (B, 480, 32) ─┬─► Dense(1) ─► softplus ─► ĉ (B, 480)  ≥ 0
                                              └─► Dense(1) ─────────────► δ (B, 480)
m̂ = m + r − q − ĉ + δ          ◄── raw m, r, q (B, 480), never normalized
```

`xn` is the normalized input. Parameters: baseline 5,025; Option 4 5,058. Both models predict at every time step (many-to-many): the LSTM state at step `t` has seen `x(0) … x(t)`.

## Data generator

All constants are the template's suggestions, except the two marked ◆ (see Design decisions).

| Quantity | Definition |
| --- | --- |
| `hour(t)` | `(h0 + t) mod 24`, `h0` an integer in 0–23 drawn once per sequence. `hour_norm = hour / 24`. |
| `day_year(t)` | `(d0 + t/24) mod 365`, `d0 ~ U[0, 365]` once per sequence. `day_year_norm = day_year / 365`. |
| `r(t)` | `U[2.35, 3.85]` i.i.d. ◆ |
| `q(t)` | `U[1.0, 2.0]` i.i.d. |
| `temp(t)` | `20 + 8·sin(2π(hour − 6)/24) + offset_seq + noise`, `offset_seq ~ N(0, 1)` once per sequence, `noise ~ N(0, 1)` per step. |
| `c(t)` | `max(0, 1.0 + 0.05·(temp − 20) + 1.2·hour_profile + noise_c)`, `hour_profile = 0.5·(1 + sin(2π(hour − 8)/24))`, `noise_c ~ N(0, 0.1²)`. |
| `m(0)` | `150 + U[0, 10]` ◆ |
| `m(t+1)` | `m(t) + r(t) − q(t) − c(t)`, built with a cumulative sum over time. |

`generate_data` splits its key into one sub-key per random quantity (`h0`, `d0`, `r`, `q`, `offset_seq`, temperature noise, `noise_c`, `m(0)`).

## Functions and names

| Section | Name | Does |
| --- | --- | --- |
| 4. Data | `generate_data(key, n_seq=400, T=480)` | Returns `X` (n_seq, T, 6), `Y` (n_seq, T), `C` (n_seq, T). |
| | `X_tr, X_te, Y_tr, Y_te, C_tr, C_te` | Split by sequence with `n_train = 300`. |
| | `x_mean, x_std` (6,), `norm_x(x)` | Input statistics over the training sequences and time steps. `Xn_tr`, `Xn_te` are the normalized inputs. |
| | `y_mean, y_std` (scalars) | Target statistics from `Y_tr`, used only to scale the baseline's output. |
| 5. Baseline | `LSTMBackbone` | `nn.RNN(nn.LSTMCell(hidden_size))(xs)` → hidden states (B, T, hidden). |
| | `ConventionalLSTM` | `LSTMBackbone` → `Dense(1)` → squeeze → (B, T). |
| | `predict_baseline(params, xn)` | `y_mean + y_std · conv_model.apply(params, xn)` → `m̂` in physical units. |
| 6. Our model | `ResidualCorrectionLSTM` | Returns `(m_pred, c_hat, delta)` as in the diagram. |
| 7. Training | `make_train_step(loss_fn, optimizer)` | Given by the template: one jitted Adam step. |
| | `train_model(model, params, loss_fn, key, X_xs, extra_arrays, y, epochs, batch_size)` | Epoch loop: split the key, `jax.random.permutation`, slice batches of 32 sequences, call the step. A batch is the dict `{"xn": …, "y": …, **extra}`. Returns `(params, losses)` with the mean batch loss of each epoch. `model` is unused inside (kept for the template's signature). |
| | `conv_loss(params, batch)` | `mean((predict_baseline(params, batch["xn"]) − batch["y"])²)`. |
| | `res_loss(params, batch)` | `mean((m_pred − batch["y"])²)`, with `m_pred` from the model applied to `batch["xn"], batch["m"], batch["r"], batch["q"]`. |
| 8. Metrics | `compute_metrics(m_pred, m, r, q, y)` | Returns `(mse, mae, physical_error)`. |
| | — | Comparison table, Option 4 diagnostics (`δ`, `ĉ`, `ĉ − δ` against `C_te`), plots. |
| 9. Reflection | — | A notes list under each question. |
| 11. Checks | — | One cell with the pitfall asserts. |

For the baseline `extra_arrays = {}`; for Option 4 `extra_arrays = {"m": X_tr[..., 0], "r": X_tr[..., 1], "q": X_tr[..., 2]}`.

**Keys.** `key = PRNGKey(112358)`; every use is `key, sub = jax.random.split(key)`: one sub-key for the data, one for each model's initialization, one for each model's training (split again every epoch for the permutation).

**Timing.** `time.time()` around each `train_model` call. It includes the one-off compilation of the first step (a few seconds), the same for both models.

**What is differentiated.** The mini-batch MSE, a scalar, with respect to the parameters only. For Option 4 the gradient flows from `m̂` back through the balance into `ĉ` and `δ`: the network is trained on the mass, and the consumption is learned without ever being a target.

## Design decisions

| Decision | Choice | Why |
| --- | --- | --- |
| Model | Option 4 | Phase A, Discussion 3. |
| Inflow range and `m(0)` ◆ | `r ~ U[2.35, 3.85]`, `m(0) = 150 + U[0, 10]` | With the template's example values the reservoir loses about 0.35 per step on average and the volume becomes negative within a sequence (down to about −200 in a prototype). These values keep the balance near neutral and the volume positive (about 85–235). |
| Temperature reference | Constant 20 in `c(t)` | It is the mean of the temperature formula; using the sample mean would tie sequences together. |
| Baseline output | `m̂ = y_mean + y_std · output` | The LSTM output is bounded, the target is around 155. Without the scaling the baseline does not converge in 300 epochs (prototype: test MSE ≈ 225) and the comparison would measure output scaling, not physics. The module stays as in the template; the scaling is a fixed function of training statistics, not a learned or physical component. |
| Loss units | Physical units for both models | The two loss curves are directly comparable. |
| Option 4 loss | MSE on the reconstructed mass only | As the assignment states. No penalty on `δ`, no new hyperparameter. |
| Hyperparameters | hidden 32, Adam 1e-2, 300 epochs, batch 32 | The template's starting values, identical for both models. |
| Seed | `PRNGKey(112358)` | Chosen by the user; replaces the template's 42 in section 4. |

## Expected results

From a prototype of this design (same data definition and hyperparameters, run with seed 42; exact numbers will differ). Use them to recognise a wiring mistake, not as targets.

| Test metric | Baseline | Option 4 |
| --- | --- | --- |
| MSE | ≈ 0.056 | ≈ 0.010 |
| MAE | ≈ 0.16 | ≈ 0.080 |
| Physical error | ≈ 3e-5 (about 0.01 % of steps) | 0 |
| Training time | ≈ 95 s on 2 CPU cores | ≈ 95 s |

- Reference points for the MSE: predicting no change, `m̂(t+1) = m(t)`, gives ≈ 0.75; using the balance with a constant consumption gives ≈ 0.48; the noise in `c(t)` sets a floor of 0.01.
- The baseline's violations are rare here because the true consumption (0.2–3.0) is far from zero compared with its error. They are still violations, and nothing in the model prevents more.
- **Option 4 leaves `ĉ` and `δ` unidentified.** Only `ĉ − δ` enters the prediction. In the prototype `δ` settled at about −0.85 at every step and `ĉ` was about 0.85 too low (MAE of `ĉ` ≈ 0.85), while `ĉ − δ` matched the true `c` with MAE ≈ 0.08. Its physical error was 0, but as a result of the fit, not a guarantee. R9 reports exactly this.
