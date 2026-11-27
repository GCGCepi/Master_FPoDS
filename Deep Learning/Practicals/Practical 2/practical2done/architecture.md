# Project architecture — Practical 2: Conservative neural networks with JAX (Phase B)

How the requirements of `spec.md` are implemented: files, notebook structure, components, data flow, and design decisions. It describes what to build, not what the results should be.

## 1. File structure

```
Practical 2/
└── practical2/
    ├── spec.md            # what the notebook must do
    ├── architecture.md    # how it is organized (this file)
    ├── tasks.md           # what to do, in order, with progress marks
    ├── aiRules.md         # how the AI assistant works with the user
    ├── log.md             # how this version was decided, and every later change
    ├── A1_Phase_A_Group_Exercise.ipynb        # Phase A: the plan (read-only)
    ├── A1_Phase_B_Individual_Exercise.ipynb   # copy of the template; the whole implementation
    └── results/           # created by the notebook: one .npz per training run (cache)
```

All the code lives in the notebook. There are no `.py` modules.

## 2. Libraries

| Library | Used for |
| --- | --- |
| `jax`, `jax.numpy` (`jnp`) | Arrays, random keys, `value_and_grad`, `jit` |
| `flax.linen` (`nn`) | `nn.Module`, `nn.LSTMCell`, `nn.RNN`, `nn.Dense`, `nn.softplus` |
| `optax` | `adam`, `clip_by_global_norm`, `chain`, `apply_updates` |
| `numpy` (`np`) | Tables, the cache (`np.savez`, `np.load`) |
| `matplotlib.pyplot` | All plots |
| `time`, `os`, `zlib` | Timing; the `results/` folder; a stable integer from each run name |

Functions that are differentiated or jitted are pure: no side effects, no in-place assignment, no Python `if` on array values. Every random call takes an explicit key.

## 3. Notebook structure

| Section | Content | Names defined |
| --- | --- | --- |
| 0–3 | Environment, JAX/Flax introduction, background, scenario | unchanged |
| 4. Data | 4.0 configuration and keys · 4.1 generator · 4.2 sanity plot · 4.3 split, normalization and the shifted test set | `CONFIG`, `run_key`, `data_key`, `generate_data`, `make_dataset`, `DATA`, `DATA_SHIFT`, `seq_ids` |
| 5. Baseline | Backbone and baseline, with the hidden-state check | `LSTMBackbone`, `ConventionalLSTM`, `n_parameters` |
| 6. Our model | Short notes on Options 2 and 3 (no code) · Option 4 · the uniform interface (own cell) | `ResidualCorrectionLSTM`, `build_model` |
| 7. Training | Training functions · runs and cache · main runs · loss curves · conclusion | `make_train_step` (given), `make_batch`, `make_loss_fn`, `make_val_fn`, `train_model`, `run_experiment`, `run_cached`, `RUNS`, `RESULTS`, `plot_losses` |
| 8. Metrics and comparison | Metrics and main table · Option 4 diagnostics · comparison plots · cold-spell table · interpretation | `compute_metrics`, `violation_share`, `evaluate`, `EVAL`, `plot_comparison`, `COLD` |
| 8E. Extended experiments | Intro · 8E.1 penalty on δ · 8E.2 low-data ablation | `print_table`, `select_mu`, `MU_RESULTS`, `MU_CHOSEN`, `LOW_DATA`, `LOW_RESULTS`, `N_SIZES`, `LOW_EVAL` |
| 9. Reflection | Notes under each question | — |
| 11. Before you submit | Template text · final checks · checklist ticked | `BUNDLES`, `STORED` |

## 4. Components

### 4.0 Configuration and keys (section 4, first cell)

The cell starts with `import os, zlib` and replaces the template's `key = jax.random.PRNGKey(42)`.

```python
CONFIG = {
    "seed": 112358,
    "n_seq": 450, "T": 480,
    "n_train": 300, "n_val": 50, "n_test": 100,
    "hidden_size": 32, "learning_rate": 1e-2, "clip_norm": 1.0,
    "epochs": 300, "batch_size": 32,
    "mu_grid": [0.01, 0.1, 1.0],
    "n_train_grid": [25, 50, 100, 200],
    "temp_shift": -15.0,
    "use_cache": True,
}
```

- `data_key = jax.random.fold_in(jax.random.PRNGKey(CONFIG["seed"]), 0)` gives all the data. `DATA` and `DATA_SHIFT` use this same key, so they share every random draw and differ only in the temperature.
- `run_key(name, seed=CONFIG["seed"]) = jax.random.fold_in(jax.random.PRNGKey(seed), zlib.crc32(name.encode()) % 2**31)`. `crc32` is stable across sessions (unlike `hash`), so a run's key depends only on the seed and its name, never on cell order. The same function gives the keys of the untrained-model checks (names such as `"check5_s112358"`).
- Run names: `<model>[_<variant>]_s<seed>`, e.g. `baseline_s112358`, `opt4_mu0.1_s112358`, `baseline_n25_s112358`.

### 4.1 Data generator — FR2

`generate_data(key, n_seq=450, T=480, temp_shift=0.0)` → `X` (n_seq, T, 6) float32, `Y` (n_seq, T), `C` (n_seq, T). The key is split into 8 sub-keys, one per random quantity: `h0`, `d0`, `r`, `q`, `offset_seq`, temperature noise, `noise_c`, `m(0)`.

| Quantity | Definition |
| --- | --- |
| `hour(t)` | `(h0 + t) mod 24`, `h0` an integer in 0–23 per sequence. `hour_norm = hour / 24`. |
| `day_year(t)` | `(d0 + t/24) mod 365`, `d0 ~ U[0, 365]` per sequence. `day_year_norm = day_year / 365`. |
| `r(t)` | `U[2.35, 3.85]` i.i.d. |
| `q(t)` | `U[1.0, 2.0]` i.i.d. |
| `temp(t)` | `20 + temp_shift + 8·sin(2π(hour − 6)/24) + offset_seq + noise`, `offset_seq ~ N(0, 1)` per sequence, `noise ~ N(0, 1)` per step. |
| `c(t)` | `max(0, 1.0 + 0.05·(temp − 20) + 1.2·hour_profile + noise_c)`, `hour_profile = 0.5·(1 + sin(2π(hour − 8)/24))`, `noise_c ~ N(0, 0.1²)`. |
| `m(0)` | `150 + U[0, 10]` |
| `m(t+1)` | `m(0) + cumsum(r − q − c)` over time; `m(t)` is `m(0)` followed by `m(t+1)` shifted by one step. |

The sanity plot (section 4.2) shows one training sequence in three stacked panels (`sharex`): the mass; `r` and `q` thin and translucent with `c` thick and black (y limits 0–5, legend above the curves); the temperature. Every panel has a title, a y label, a legend and a light grid.

### 4.2 Bundles — FR3

`make_dataset(key, n_train=300, temp_shift=0.0, stats_from=None, tag="main")` → a dictionary:

- `X_tr, Y_tr, C_tr` (first `n_train` of sequences 0–299), `X_va, Y_va, C_va` (300–349), `X_te, Y_te, C_te` (350–449);
- `x_mean`, `x_std` (6,) and `y_mean`, `y_std` (floats), computed in float64 on `X_tr`, `Y_tr`, or copied from `stats_from`;
- `Xn_tr, Xn_va, Xn_te` = `(X − x_mean) / x_std`; and `tag`.

`DATA = make_dataset(data_key)`; `DATA_SHIFT = make_dataset(data_key, temp_shift=CONFIG["temp_shift"], stats_from=DATA, tag="shift")`. A model trained on `DATA` must see the cold inputs through the normalization it was trained with. Raw `m, r, q` are always `X[..., 0]`, `X[..., 1]`, `X[..., 2]`.

### 4.3 Models — FR4

```
Baseline (Option 1)                                                         5,025 parameters
xn (B, T, 6) ─► LSTM(32) ─► h (B, T, 32) ─► Dense(1) ─► o (B, T) ─► m̂ = y_mean + y_std · o

Option 4 (residual correction)                                              5,058 parameters
xn (B, T, 6) ─► LSTM(32) ─► h (B, T, 32) ─┬─► Dense(1, "head_c") ─► softplus ─► ĉ (B, T) ≥ 0
                                          └─► Dense(1, "head_delta") ────────► δ (B, T)
m̂ = ((m + r) − q) − ĉ + δ                  ◄── raw m, r, q (B, T), fixed order of operations
```

- **Section 5**, one code cell: `LSTMBackbone(hidden_size)` = `nn.RNN(nn.LSTMCell(hidden_size))(xs)` → (B, T, hidden); `ConventionalLSTM` = backbone → `Dense(1)` → squeeze; `n_parameters(params)`; then the check: hidden states of the backbone and the baseline's output on two training sequences, and its parameter count. The Markdown before it explains many-to-many prediction, Flax's orthogonal recurrent initialization, why the output is scaled outside the module, and the parameter count (4,992 + 33).
- **Section 6, Options 2 and 3:** the template's Markdown cell and stub code cell for each are replaced by one Markdown cell each (3–5 lines): what the option predicts, where the physics enters, and why it was not chosen (Phase A, Discussion 3: Option 2 does not guarantee conservation and needs `λ` tuned; Option 3 cannot represent a net unmetered gain if the balance is incomplete).
- **Option 4:** `ResidualCorrectionLSTM.__call__(xs_norm, m_phys, r_phys, q_phys)` → `(m_pred, c_hat, delta)`, then its untrained check, in one cell.
- **Uniform interface**, own cell: `build_model(kind, data)` → `(model, init_fn, predict_fn)`, `kind ∈ {"baseline", "option4"}`. `init_fn(key)` uses one training sequence as dummy input. `predict_fn(params, xn, x_raw)` → `(m_pred, c_hat, delta)`; for the baseline `m_pred = y_mean + y_std · output` and `c_hat = delta = None`.

### 4.4 Training (section 7) — FR5

Section 7 is written for reading the results: complete functions, short explanations, no defensive code and no checks (those are in section 11). Each value is printed once.

**Cell 1 — training functions** (after the template's Markdown and one explanatory Markdown cell):

- `make_train_step(loss_fn, optimizer)` — the template's.
- `HIDDEN_SIZE`, `EPOCHS`, `BATCH_SIZE` from `CONFIG`; `optimizer = optax.chain(optax.clip_by_global_norm(CONFIG["clip_norm"]), optax.adam(CONFIG["learning_rate"]))`.
- `make_batch(X_xs, extra_arrays, y, idx)` → `{"xn": X_xs[idx], "y": y[idx], **{k: v[idx] for k, v in extra_arrays.items()}}`. Used by `train_model` and by the check of section 11.
- `make_loss_fn(predict_fn, mu=0.0)` → `loss(params, batch) = mean((m_pred − y)²) + μ · mean(δ²)` (the term only when `mu > 0` and the model has `δ`; decided in Python when the function is built).
- `make_val_fn(predict_fn, data)` → jitted validation MSE, no penalty term.
- `train_model(model, params, loss_fn, key, X_xs, extra_arrays, y, epochs=EPOCHS, batch_size=BATCH_SIZE, val_fn=None)` → `(best_params, history)`. Per epoch: split the key, `jax.random.permutation`, slices of `batch_size` (300 → 9 batches of 32 and one of 12), one step per batch; the epoch's training loss is the mean of the batch losses weighted by batch size. After each epoch, `val_fn(params)` is recorded and the best parameters kept. `history = {"train": [...], "val": [...], "best_epoch": int (1-based)}`. `model` is unused (kept for the template's signature). The step is jitted once per run; JAX compiles it for the two batch shapes.

**Cell 2 — runs and cache:**

- `run_experiment(name, kind, data, mu=0.0, eval_sets=None, seed=CONFIG["seed"])` → dict: `train_loss`, `val_loss` (300,), `best_epoch`, `time` (s, includes compilation), `n_params`, `test_m_pred`, and when the model has them `test_c_hat`, `test_delta`; for each bundle in `eval_sets` the same with its prefix (`shift_…`). Keys: `k_init, k_train = jax.random.split(run_key(name, seed))`. Trained parameters are not kept.
- `run_cached(name, kind, data, mu=0.0, eval_sets=None, seed=CONFIG["seed"])` → the same dict, loaded from `results/<name>.npz` if it exists and `CONFIG["use_cache"]`, otherwise computed and saved. It records `RUNS[name] = {"kind": kind, "tag": data["tag"], "mu": mu, "seed": seed}` and prints one line: `<name>: computed` or `<name>: loaded from cache`.
- `eval_sets={"shift": DATA_SHIFT}` is passed only by the two main runs.

**Cell 3 — main runs:** `RESULTS = {}`; `RESULTS["baseline"]`, `RESULTS["opt4"]`. Output: two lines.

**Cell 4 — loss curves:** `plot_losses(runs)`: per model, training (solid) and validation (dashed) on log–log axes, a dot at the best epoch; then one printed line per model: `first → last training loss, best epoch, validation MSE at the best epoch`. The training time is not printed here.

**Conclusion (Markdown):** one cell, about 6–10 lines, written after reading the curves and FR5.5's printed lines: how each model's loss starts and ends, how stable the validation curves are, and what the best-epoch selection did, citing those numbers.

### 4.5 Metrics and comparison (section 8) — FR6, FR7

**First part (a compact table, metrics as rows and models as columns):**

- Markdown ★: accuracy (MSE, MAE) vs consistency; the one-sided physical error (only a negative implied consumption is impossible); the violation share; for Option 4 the implied consumption is `ĉ − δ`.
- One code cell: `compute_metrics(m_pred, m, r, q, y)` → `(mse, mae, physical_error)`, with the implied consumption `((m + r) − q) − m_pred`; `violation_share(m_pred, m, r, q)`; `evaluate(result, data, prefix="test")` → dict `mse, mae, phys, share` plus, when `c_hat` is stored, `mean_delta, mean_abs_delta, max_abs_delta, mae_c, mae_eff`. Then the table:

```
Metric (test set)                       Baseline      Option 4
MSE                                        …             …
MAE                                        …             …
Physical error                             …             …
Steps with negative implied c (%)          …             …
Training time (s)                          …             …
```

followed by two or three "Reading" lines (FR6.2).

**Rest:**

- Option 4 diagnostics (Markdown ★ + code): the five values of FR7.1 and two printed interpretation lines (is `δ` small? does `ĉ − δ` track `c` close to the noise level?).
- `plot_comparison(results, data, seq=0, hours=168)`: 2 × 2 panels as in FR7.2, shared x, grey zero lines in (b) and (d).
- Cold-spell table: share of steps with `c = 0`, then rows Baseline / Option 4 with `MSE in-dist`, `MSE cold`, `x worse`, `phys. cold`, `viol. cold`.
- Interpretation (Markdown).

### 4.6 Extended experiments (section 8E) — FR8, FR9

- **Intro** (Markdown): a two-row table (question → experiment), then a code cell defining `print_table(rows, columns)` (rows: list of `(label, dict)`; columns: list of `(key, header, format)`).
- **8E.1:** `MU_RESULTS = {0.0: RESULTS["opt4"]}` plus `run_cached(f"opt4_mu{mu}_s112358", "option4", DATA, mu=mu)` for each `μ`; `select_mu(val_mse, tolerance=0.02)` → `(chosen μ, threshold)` from the minimum of each run's `val_loss`; table; plot; check; interpretation.
- **8E.2:** `LOW_DATA[n] = make_dataset(data_key, n_train=n, tag=f"n{n}")`; `LOW_RESULTS[label][n] = run_cached(f"{label}_n{n}_s112358", kind, LOW_DATA[n])` for `label ∈ {baseline, opt4}`; the 300 entries are the main runs; table; two plots side by side (x axis: the five sizes as tick labels); check; interpretation.

### 4.7 Final checks (section 11) — FR11

The template's pitfall list and checklist stay, unchanged in wording. The template holds both in one Markdown cell, so that cell is split in two (the pitfall list, then the checklist), and a Markdown line and one code cell are inserted between them; the checklist is then ticked. The cell reads every run in `RUNS` back from `results/`, runs the six checks of FR11 with `assert`, and prints one line per check:

```
✓ 1. c(t) never enters the models: 6 input features, batches hold only xn, x, y
✓ 2. Train, validation and test share no sequence
✓ 3. Normalization statistics come from the training split
✓ 4. All 13 runs used the same settings (300 epochs; μ > 0 only in 8E.1)
✓ 5. Option 4's balance uses raw physical units
✓ 6. Every run has its own random key
All 6 checks passed.
```

Check 2 identifies a sequence by its first 5 volumes (`m(0)` alone can repeat by chance in float32). Check 1 builds one batch with `make_batch` exactly as `train_model` does.

## 5. Data flow and shapes

```
generate_data(data_key) ─► X (450, 480, 6), Y (450, 480), C (450, 480)
   │ split by sequence
train 0–299 (300)          validation 300–349 (50)          test 350–449 (100)
   │ x_mean, x_std, y_mean, y_std ─────────► applied to all splits (and to DATA_SHIFT)

per batch of B sequences: {xn (B, 480, 6), x (B, 480, 6), y (B, 480)}
   ─► predict_fn ─► m_pred (B, 480) [, c_hat, delta] ─► loss (scalar)
   ─► value_and_grad wrt params ─► clip ─► Adam
after each epoch: validation MSE (50, 480) ─► keep the best parameters
after training: predictions on the test split (100, 480) [and on DATA_SHIFT's] ─► results/<name>.npz
```

`C` appears in no batch and no loss; it is used only in FR7.1, FR8's table and plot, and the cold-spell share.

## 6. Design decisions

| Decision | Choice | Reason |
| --- | --- | --- |
| Model | Option 4, against the baseline | Phase A, Discussion 3. |
| Options 2 and 3 in the notebook | Short Markdown note, no code | Only Option 4 is used; stub code that never runs adds noise. |
| Inflow range, `m(0)` | `r ~ U[2.35, 3.85]`, `m(0) = 150 + U[0, 10]` | The template's example values make the volume negative within a sequence; these keep it between about 80 and 250. |
| Temperature reference in `c(t)` | Constant 20 | The mean of the formula; unaffected by `temp_shift`. |
| Sequences | 450 = 300 + 50 + 100 | The assignment's 300/100 plus a validation set, so nothing is chosen on the test set. |
| Baseline output | `m̂ = y_mean + y_std · output` | The target is around 155 while the LSTM output is of order 1; without the scaling the baseline would mostly be learning an offset, and the comparison would measure output scaling, not physics. |
| Gradient clipping | Global norm 1.0, every run | Standard protection for an LSTM through 480 steps; equal for both models. |
| Best epoch | Lowest validation MSE; always 300 epochs | The baseline's validation loss jumps between epochs; selection removes that luck. Full length keeps times comparable. |
| Last batch | Kept (12 sequences) | Every sequence is used every epoch; two compiled shapes is a negligible cost. |
| Penalty on δ | Experiment, `μ` on validation | The main model stays as the assignment defines it; the penalty tests the identifiability issue. |
| Cold-spell set | Built in 4.3, used once in section 8 | Shows the two models outside the training conditions at no training cost. |
| Section 7 style | Complete functions, no failsafes, one output per fact, one conclusion | Results first; correctness is checked once, in section 11. |
| Cache | One `.npz` per run | 13 training runs; re-running the notebook to change a plot or a text should not retrain them. Delete `results/` after changing code. |

## 7. How to run

Open `practical2/A1_Phase_B_Individual_Exercise.ipynb` and choose **Restart kernel and run all**. For a fully reproducible run, delete `results/` first.
