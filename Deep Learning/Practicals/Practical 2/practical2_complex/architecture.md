# Project architecture — Practical 2: Conservative neural networks with JAX (Phase B)

This document explains **how** the requirements in `spec.md` are implemented: files, libraries, notebook structure, components, data flow and design decisions. Every function in the notebook appears here, with the requirement (FR) it serves.

## 1. File structure

```
Practical 2/
└── practical2_complex/
    ├── A1_Phase_A_Group_Exercise.ipynb       # Phase A: the plan (already written, read-only)
    ├── spec.md            # What the notebook must do
    ├── architecture.md    # How it is organized (this file)
    ├── tasks.md           # What to do, in order, with progress marks
    ├── aiRules.md         # How the AI assistant works with the user
    ├── log.md             # Chronological record of decisions and changes
    ├── A1_Phase_B_Individual_Exercise.ipynb   # copy of the template; the whole implementation
    └── results/           # created by the notebook: one .npz per training run (cache)
```

All the code lives in the notebook, as the assignment asks. There are no `.py` modules.

## 2. Libraries

| Library | Used for |
| --- | --- |
| `jax`, `jax.numpy` (as `jnp`) | Arrays, random keys, `value_and_grad`, `jit` |
| `flax.linen` (as `nn`) | `nn.Module`, `nn.LSTMCell`, `nn.RNN`, `nn.Dense`, `nn.softplus` |
| `optax` | `adam`, `clip_by_global_norm`, `chain`, `apply_updates` |
| `numpy` (as `np`) | Metrics tables, the cache (`np.savez`, `np.load`), plotting inputs |
| `matplotlib.pyplot` | All plots |
| `time`, `os`, `zlib` | Timing; the `results/` folder; a stable integer from each run name |

Install: `pip install "jax[cpu]" flax optax matplotlib` (the template's first cell).

**Rules for JAX code.** Functions that are differentiated or jitted are pure: no side effects, no in-place assignment, no Python `if` on array values. Random numbers always take an explicit key. Losses are converted to Python floats before being stored.

## 3. Notebook structure

The template's sections are kept. Each new block is a Markdown cell followed by its code cell; each code cell ends with the task's checks as `assert` statements, after printing the values involved.

| Section | Content | Names defined |
| --- | --- | --- |
| 0–3 | Environment, JAX/Flax introduction, background, scenario | unchanged |
| 4. Data | Extra imports, configuration, generator, sanity plot, split, normalization, the shifted test set | `CONFIG`, `RUN_NAMES`, `run_key`, `data_key`, `generate_data`, `make_dataset`, `DATA`, `DATA_SHIFT` |
| 5. Baseline | The conventional LSTM | `LSTMBackbone`, `ConventionalLSTM`, `n_parameters` |
| 6. Our model | Option 4, Option 3 for the ablation, the uniform model interface | `ResidualCorrectionLSTM`, `ConservativeLSTM`, `build_model` (the `SoftConstraintLSTM` stub is untouched) |
| 7. Training | Step, loop, the run function, the two main runs, loss curves | `make_train_step` (given), `make_loss_fn`, `make_val_fn`, `train_model`, `run_experiment`, `run_cached`, `RESULTS`, `plot_losses` |
| 8. Metrics and comparison | Metrics, naive references, main table, plots, interpretation | `compute_metrics`, `violation_rate`, `evaluate`, `naive_references`, `print_table`, `metrics_of`, `plot_comparison` |
| 8E. Extended experiments | 8E.1 penalty on δ · 8E.2 ablations · 8E.3 seeds · 8E.4 low data · 8E.5 distribution shift · 8E.6 incomplete physics | `select_mu`, `DATA_INC` |
| 9. Reflection | Notes under each question | — |
| 11. Before you submit | Pitfall asserts; checklist ticked | — |

## 4. Components

### 4.0 Configuration and keys (section 4, first cell)

The cell starts with `import os, zlib` (sections 0–3, including the template's import cell, stay unchanged) and replaces the template's `key = jax.random.PRNGKey(42)`.

```python
CONFIG = {
    "seed": 112358,
    "n_seq": 450, "T": 480,
    "n_train": 300, "n_val": 50, "n_test": 100,
    "hidden_size": 32, "learning_rate": 1e-2, "clip_norm": 1.0,
    "epochs": 300, "batch_size": 32,
    "mu_grid": [0.01, 0.1, 1.0],
    "seeds": [112358, 112359, 112360],
    "n_train_grid": [25, 50, 100, 200],
    "temp_shift": -15.0,
    "unmetered_inflow": 1.0,
    "use_cache": True,
}
```

The template's `HIDDEN_SIZE`, `EPOCHS`, `BATCH_SIZE` and `optimizer` in section 7 are set from `CONFIG`.

**Keys.**

- Data: `data_key = jax.random.fold_in(jax.random.PRNGKey(CONFIG["seed"]), 0)`. All three datasets (`DATA`, `DATA_SHIFT`, `DATA_INC`) use this same key on purpose, so they share every random draw and differ only in the changed physical setting.
- Training runs: every run has a unique name of the form `<model>[_<variant>]_s<seed>` (`"baseline_s112358"`, `"opt4_s112358"`, `"opt4_mu0.1_s112358"`, `"opt3_s112358"`, `"baseline_raw_s112358"`, `"baseline_n25_s112358"`, `"opt3_inc_s112358"`, …). The run key is `run_key(name, seed) = jax.random.fold_in(jax.random.PRNGKey(seed), zlib.crc32(name.encode()) % (2**31))`, so it depends only on the seed and the name, not on the order in which cells are run. It is split once into `k_init` and `k_train`; `k_train` is split again at every epoch for the permutation. `RUN_NAMES` is a dictionary from each name to the arguments it was run with; asking for an existing name with different arguments raises a `ValueError`, so two different runs can never share a key. No key is consumed twice. The same rule gives the keys of the trial runs and of the untrained-model checks (names such as `"trial31_s112358"`, `"check21_s112358"`; these are not recorded in `RUN_NAMES`).

### 4.1 Data (section 4) — FR1, FR2

**Generator.** `generate_data(key, n_seq=450, T=480, unmetered_inflow=0.0, temp_shift=0.0)` → `X` (n_seq, T, 6) float32, `Y` (n_seq, T), `C` (n_seq, T). The key is split into 8 sub-keys, one per random quantity, in this order: `h0`, `d0`, `r`, `q`, `offset_seq`, temperature noise, `noise_c`, `m(0)`.

| Quantity | Definition |
| --- | --- |
| `hour(t)` | `(h0 + t) mod 24`, `h0` an integer in 0–23 drawn once per sequence. `hour_norm = hour / 24`. |
| `day_year(t)` | `(d0 + t/24) mod 365`, `d0 ~ U[0, 365]` once per sequence. `day_year_norm = day_year / 365`. |
| `r(t)` | `U[2.35, 3.85]` i.i.d. |
| `q(t)` | `U[1.0, 2.0]` i.i.d. |
| `temp(t)` | `20 + temp_shift + 8·sin(2π(hour − 6)/24) + offset_seq + noise`, `offset_seq ~ N(0, 1)` per sequence, `noise ~ N(0, 1)` per step. |
| `c(t)` | `max(0, 1.0 + 0.05·(temp − 20) + 1.2·hour_profile + noise_c)`, `hour_profile = 0.5·(1 + sin(2π(hour − 8)/24))`, `noise_c ~ N(0, 0.1²)`. |
| `m(0)` | `150 + U[0, 10]` |
| `m(t+1)` | `m(t) + r(t) − q(t) − c(t) + unmetered_inflow`, built with a cumulative sum over time. |

`temp_shift` moves the temperature the models see **and** the consumption it drives. `unmetered_inflow` changes the mass only: it is in no feature.

**Dataset bundle.** `make_dataset(key, n_train=300, unmetered_inflow=0.0, temp_shift=0.0, stats_from=None, tag="main")` → a dictionary:

- `X_tr, Y_tr, C_tr` (first `n_train` of sequences 0–299), `X_va, Y_va, C_va` (300–349), `X_te, Y_te, C_te` (350–449);
- `x_mean`, `x_std` (6,), `y_mean`, `y_std` (scalars), computed on `X_tr`, `Y_tr` — or copied from the bundle `stats_from` when given (used by the shifted set, FR11);
- `Xn_tr, Xn_va, Xn_te`: normalized inputs, `(X − x_mean) / x_std`;
- `tag`: a short string naming the bundle (`"main"`, `"n25"`, `"shift"`, `"inc"`, …), passed as the keyword argument `tag="main"` of `make_dataset`.

`DATA = make_dataset(data_key)` is the main bundle. `DATA_SHIFT = make_dataset(data_key, temp_shift=CONFIG["temp_shift"], stats_from=DATA, tag="shift")` is the cold-spell bundle (FR11); it is built here because the training runs evaluate on it. Only its test split is used. Raw `m, r, q` are always read from the unnormalized arrays: `X[..., 0]`, `X[..., 1]`, `X[..., 2]`.

### 4.2 Models (sections 5–6) — FR3

```
Baseline (Option 1)                                                            5,025 parameters
xn (B, T, 6) ─► LSTM(32) ─► h (B, T, 32) ─► Dense(1) ─► o (B, T) ─► m̂ = y_mean + y_std · o

Option 4 (residual correction)                                                 5,058 parameters
xn (B, T, 6) ─► LSTM(32) ─► h (B, T, 32) ─┬─► Dense(1) ─► softplus ─► ĉ (B, T)  ≥ 0
                                          └─► Dense(1) ─────────────► δ (B, T)
m̂ = ((m + r) − q) − ĉ + δ                    ◄── raw m, r, q (B, T)

Option 3 (ablation: δ removed)                                                 5,025 parameters
m̂ = ((m + r) − q) − ĉ
```

- `LSTMBackbone(hidden_size)`: `nn.RNN(nn.LSTMCell(hidden_size))(xs)` → hidden states at every step (B, T, hidden). Flax initializes the recurrent weights of `LSTMCell` with orthogonal matrices by default, which keeps the norm of the state stable at the start of training; nothing needs to be added for it.
- `n_parameters(params)`: the number of scalar parameters of a pytree (used by the checks and stored with each run).
- `ConventionalLSTM`: backbone → `Dense(1)` → squeeze. The module is the template's; the output scaling is applied outside it, in `build_model`.
- `ResidualCorrectionLSTM.__call__(xs_norm, m_phys, r_phys, q_phys)` → `(m_pred, c_hat, delta)`.
- `ConservativeLSTM.__call__(xs_norm, m_phys, r_phys, q_phys)` → `(m_pred, c_hat)`.

All models are many-to-many: at step `t` the LSTM state has seen `x(0) … x(t)` and the model predicts `m(t+1)`.

**Uniform interface.** `build_model(kind, data, output_scaling=True)` → `(model, init_fn, predict_fn)`:

- `kind ∈ {"baseline", "option4", "option3"}`;
- `init_fn(key)` → `params`, using one training sequence as the dummy input;
- `predict_fn(params, xn, x_raw)` → `(m_pred, c_hat, delta)` in physical units. The baseline returns `c_hat = delta = None` (its results simply have no `…_c_hat` and `…_delta` entries); Option 3 returns `delta = zeros`. For the baseline, `m_pred = y_mean + y_std · output`, or `output` itself when `output_scaling=False` (FR8).

### 4.3 Loss — FR4.1, FR7

One loss for every model, built by `run_experiment`:

```
loss(params, batch) = mean((m_pred − batch["y"])²) + μ · mean(delta²)
```

with `μ = 0` except in the runs of FR7 (and the term is skipped when the model has no `δ`). The loss is in physical units, so the curves of different models are directly comparable.

**What is differentiated.** The mini-batch loss, a scalar, with respect to the parameters only. For Options 3 and 4 the gradient flows from `m̂` back through the balance (a fixed, parameter-free computation) into the heads. The consumption is learned without ever being a target: `C` appears in no batch.

### 4.4 Training (section 7) — FR4

- `make_train_step(loss_fn, optimizer)` — given by the template: one jitted step returning `(params, opt_state, loss)`.
- Optimizer: `optax.chain(optax.clip_by_global_norm(CONFIG["clip_norm"]), optax.adam(CONFIG["learning_rate"]))`, the same for every run. `train_model` uses this global `optimizer` (the template's signature has no optimizer argument).
- `make_loss_fn(predict_fn, mu=0.0)` builds the loss of §4.3; `make_val_fn(predict_fn, data)` builds the jitted validation MSE (no penalty term).
- `train_model(model, params, loss_fn, key, X_xs, extra_arrays, y, epochs=EPOCHS, batch_size=BATCH_SIZE, val_fn=None, run_name="")` → `(best_params, history)`.
  - A batch is the dictionary `{"xn": X_xs[idx], "y": y[idx], **{k: v[idx] for k, v in extra_arrays.items()}}`. `extra_arrays = {"x": X_tr}` (the raw inputs) for every model, so batches have exactly the keys `xn`, `x`, `y`.
  - Per epoch: split the key, `jax.random.permutation`, slice batches of `batch_size` (the last may be smaller), call the step; a non-finite loss raises `ValueError("Run <name>: loss is NaN at epoch e, batch b.")`.
  - After each epoch: `val_fn(params)` (a jitted validation MSE) is recorded; the parameters with the lowest value so far are kept.
  - `history = {"train": [...], "val": [...], "best_epoch": int (1-based), "batch_sizes": [...], "batch_keys": [...]}`; the training loss of an epoch is the mean over its batches weighted by batch size; the last two entries record the batches of one epoch, for the checks of tasks 3.1 and 6.2. `model` is unused inside (kept for the template's signature). With `val_fn=None` the last parameters are returned.
- `run_experiment(name, kind, data, seed=CONFIG["seed"], mu=0.0, output_scaling=True, eval_sets=None, epochs=CONFIG["epochs"])` → a dictionary of NumPy arrays and floats:
  1. assert that `name` ends with `_s<seed>`; derive `k_init`, `k_train` from the seed and the name;
  2. `build_model`, initialize, build the loss and the validation function, train (timed with `time.time()`, including the one-off compilation);
  3. evaluate the best parameters on the test split of `data` and on the test split of each extra bundle in `eval_sets`. **Rule:** every run trained on the full `DATA` (main runs, the `μ` runs, both ablations, the extra seeds) passes `eval_sets={"shift": DATA_SHIFT}`; the low-data runs and the incomplete-physics runs pass none, because their normalization statistics differ from those of `DATA_SHIFT`;
  4. return `train_loss`, `val_loss`, `best_epoch`, `time`, `n_params`, `batch_keys`, and for each evaluated set the predictions `m_pred`, `c_hat`, `delta` (keys prefixed with the set name, `test_…`, `shift_…`).
- `run_cached(name, kind, data, seed, mu, output_scaling, eval_sets, epochs)` (same arguments and defaults as `run_experiment`) → the same dictionary. It records in `RUN_NAMES[name]` the tuple `(kind, data["tag"], seed, mu, output_scaling, epochs)` and raises `ValueError` if the name already exists with a different tuple (see §4.0). If `CONFIG["use_cache"]` and `results/<name>.npz` exists, it is loaded; otherwise `run_experiment` runs and its result is saved with `np.savez`. A printed line says whether the run was computed or loaded. Trained parameters are not saved: everything later cells need is in the dictionary.
- `epochs` differs from `CONFIG["epochs"]` only in the short trial runs of tasks 3.1–3.2; every reported run uses 300.
- `plot_losses(runs)` — training (solid) and validation (dashed) curves on log-scale axes, best epochs marked.

### 4.5 Metrics (section 8) — FR5, FR6

- `compute_metrics(m_pred, m, r, q, y)` → `(mse, mae, physical_error)`. The implied consumption is computed as `((m + r) − q) − m_pred`, the same order of operations as inside the models. With that order, Option 3's implied consumption equals `ĉ` up to a rounding that cannot change its sign, so its physical error is exactly 0 in float32.
- `violation_rate(m_pred, m, r, q)` → share of steps with negative implied consumption.
- `evaluate(result, data, prefix="test")` → a dictionary with MSE, MAE, physical error, violation rate, and, when `c_hat` exists, MAE of `ĉ`, MAE of `ĉ − δ`, mean `δ`, mean and maximum `│δ│`.
- `naive_references(data)` → metrics of persistence (`m̂ = m`) and of the constant-consumption balance (`m̂ = m + r − q − c̄`, with `c̄` the mean of `m + r − q − Y` over the training split; this uses the observed target, not `C`).
- `print_table(rows, columns)` — a plain-text table with aligned columns.
- `metrics_of(label)` — `evaluate` of `RESULTS[label]` on `DATA`, plus its training time and best epoch.
- `plot_comparison(results, data, seq=0)` — the four panels of FR6.2.

### 4.6 Extended experiments (section 8E) — FR7–FR12

Every experiment is a loop over `run_cached` calls, a table, one or two plots, and a Markdown interpretation written after reading the numbers.

| Experiment | Runs (names without the `_s<seed>` suffix; seed 112358 unless stated) | Notes |
| --- | --- | --- |
| 8E.1 Penalty on δ (FR7) | `opt4_mu0.01`, `opt4_mu0.1`, `opt4_mu1.0` | `select_mu(runs)` takes the four candidates (`μ = 0` is the main `opt4` run) and applies the validation rule of FR7; the chosen run is aliased as Option 4-R. If `μ = 0` is chosen, Option 4-R is the main model and the text says so. |
| 8E.2 Ablations (FR8) | `opt3`, `baseline_raw` | `baseline_raw` uses `output_scaling=False`. |
| 8E.3 Seeds (FR9) | `baseline` and `opt4` for seeds 112359, 112360 | Mean ± std over the three seeds with NumPy. |
| 8E.4 Low data (FR10) | `baseline_n{25,50,100,200}`, `opt4_n{…}` | Each uses `make_dataset(data_key, n_train=n, tag=f"n{n}")`: same validation and test sequences, statistics from the `n` training sequences. |
| 8E.5 Shift (FR11) | none (evaluation only) | Reads the `shift_…` predictions already stored in the results of `baseline`, `opt4`, Option 4-R and `opt3` (see the rule in §4.4). |
| 8E.6 Incomplete physics (FR12) | `opt3_inc`, `opt4_inc` | `DATA_INC = make_dataset(data_key, unmetered_inflow=CONFIG["unmetered_inflow"], tag="inc")`: its own training statistics. The "true data" row applies `compute_metrics` to `m_pred = Y_te`. |

## 5. Data flow and shapes

```
generate_data(data_key) ─► X (450, 480, 6), Y (450, 480), C (450, 480)
   │ split by sequence
   ▼
train 0–299 (300)          validation 300–349 (50)          test 350–449 (100)
   │ x_mean, x_std, y_mean, y_std  ───────────────►  applied to all three
   ▼
Xn_tr (300, 480, 6)   +   raw X_tr (300, 480, 6)   +   Y_tr (300, 480)        C_* : diagnostics only

Training, per mini-batch of B = 32 sequences (10 batches per epoch, the last of 12):
batch = {xn (B, 480, 6), x (B, 480, 6), y (B, 480)}
   ─► predict_fn ─► m_pred (B, 480) [, c_hat, delta]
   ─► loss (scalar) ─► value_and_grad wrt params ─► clip ─► Adam ─► new params
after each epoch: validation MSE on (50, 480) ─► keep the best parameters
```

## 6. Design decisions

| Decision | Choice | Reason |
| --- | --- | --- |
| Model | Option 4 | Phase A, Discussion 3: keep the physics as the backbone, expose what it misses. |
| Inflow range and `m(0)` | `r ~ U[2.35, 3.85]`, `m(0) = 150 + U[0, 10]` | With the template's example values the reservoir loses about 0.35 per step and the volume goes negative within a sequence (down to about −200 in a prototype). These values keep the balance near neutral and the volume positive (about 85–235). |
| Temperature reference in `c(t)` | Constant 20 | It is the mean of the temperature formula; a sample mean would tie sequences together and move under `temp_shift`. |
| Number of sequences | 450 = 300 + 50 + 100 | Keeps the assignment's 300 training and 100 test sequences and adds a validation set, so nothing is ever chosen on the test set. |
| Baseline output | `m̂ = y_mean + y_std · output` | The target is around 155 and the LSTM output is bounded. Without the scaling the baseline does not converge in 300 epochs (prototype: test MSE ≈ 225), and the comparison would measure output scaling instead of physics. FR8 shows the unscaled version. |
| Loss units | Physical units for every model | Directly comparable curves and tables. |
| Gradient clipping | Global norm 1.0, every model | The standard safeguard against exploding gradients in recurrent networks, here over 480 steps. Applied to all models so the comparison stays fair. |
| Best epoch on validation | Keep the parameters with the lowest validation MSE; always train 300 epochs | With a learning rate of 1e-2 the validation loss of the baseline fluctuates between epochs (prototype: between 0.017 and 0.064 over the last 50). Selecting the best epoch removes that luck from the comparison. No early termination, so times are comparable. |
| Penalty on δ | `μ · mean(δ²)`, `μ` chosen on validation | A norm penalty on the one unconstrained output. It states in the objective what the plan assumed: the correction should be small unless the data needs it. Kept as an experiment; the main model is Option 4 exactly as the assignment defines it. |
| Rule for `μ` | Largest `μ` within 2 % of the best validation MSE | Prefers the most physical model among those that fit equally well. Uses neither the test set nor the hidden `C`. |
| Seeds | Base seed 112358 (chosen by the user); data fixed, three seeds (112358, 112359, 112360) for initialization and batch order | Separates the effect of the architecture from training luck at a moderate cost. |
| Low-data runs | Same epochs, same batch size | As the assignment asks: only the training-set size changes. Fewer sequences therefore also mean fewer updates. |
| Shifted set | Temperature −15 °C, same key | Pushes the true consumption onto its boundary (zero), where a violation is most likely; sharing the key isolates the effect of the shift. |
| Unmetered inflow | 1.0 per step | Larger than the consumption on cool nights, so the net hidden term changes sign and `ĉ ≥ 0` alone cannot represent it. |
| Cache | One `.npz` per run in `results/` | A full run takes tens of minutes; with the cache, re-running the notebook to change a plot takes seconds. Delete the folder (or set `use_cache` to `False`) for a full reproducible run. |
| Checks | `assert` statements in each cell | "Run all" fails loudly when a requirement breaks. |

## 7. Expected results

From prototypes of this design (same data definition, hyperparameters, clipping and best-epoch selection; about 95 s per 300-epoch run on 2 CPU cores). The main comparison and the shift figures for the baseline and Option 4 were run with seed 112358; the other figures come from seed 42 and are marked. Exact numbers will differ. Use them to recognise a wiring mistake, not as targets, and never tune towards them.

**Main comparison (test set).**

| | MSE | MAE | Physical error | Violation rate |
| --- | --- | --- | --- | --- |
| Persistence | ≈ 0.75 | | | |
| Constant consumption | ≈ 0.48 | | 0 | 0 |
| Baseline | ≈ 0.016 | ≈ 0.098 | 0 or very close | 0 or very close |
| Option 4 | ≈ 0.0100 | ≈ 0.080 | 0 | 0 |

The noise in `c(t)` sets an MSE floor of 0.01, which Option 4 reaches.

**Read this before writing any interpretation.** With this data, a well-trained baseline almost never implies negative consumption on the test set: the true consumption (0.2–3.0) is far from zero compared with the baseline's error. This differs from the assignment's reference table, whose baseline was much less accurate. The honest statement is that the baseline's zero is *measured on this test set* and nothing in the model protects it; the experiments below show where it breaks.

- **Option 4, `μ = 0`:** `δ` settles near −0.8 at every step and `ĉ` is about 0.8 too low (MAE of `ĉ` ≈ 0.81), while `ĉ − δ` matches the true `c` (MAE ≈ 0.080). The two terms are not identified.
- **Penalty on δ (seed 42):** with `μ = 0.1`, mean `│δ│` ≈ 0.006 and the MAE of `ĉ` ≈ 0.080, at the same test MSE. Validation MSE is about 0.0102 for every `μ`.
- **Option 3 (seed 42):** MSE ≈ 0.0101, the same as Option 4; physical error exactly 0.
- **Unscaled baseline (seed 42, no clipping):** MSE ≈ 225, physical error ≈ 5.5, violations on about half the steps: an under-trained model, not a property of direct prediction.
- **Low data (25 sequences; seed 42, no clipping):** baseline MSE ≈ 1.1 with about 4 % violations; Option 4 MSE ≈ 0.014 with none.
- **Shift (−15 °C):** true `c = 0` on about 14 % of steps. Baseline MSE in the tens of thousands (≈ 20,000) with violations on about 0.7 % of steps; Option 4 MSE ≈ 0.16 with violations on about 0.1 % of steps; Option 3 (seed 42) MSE ≈ 0.31 with exactly none.
- **Incomplete physics (seed 42, no clipping):** Option 3 MSE ≈ 0.031; Option 4 MSE ≈ 0.010, with mean `│δ│` ≈ 0.46 and a "physical error" ≈ 0.07 on about 28 % of steps — which is correct there, because the true mass really does rise by more than `r − q` on those steps.

## 8. How to run

Open the `practical2_complex` folder in VS Code (with the Jupyter extension) or start `jupyter notebook` in it, open `A1_Phase_B_Individual_Exercise.ipynb`, and choose **Restart kernel and run all**. For a fully reproducible run, delete the `results/` folder first.
