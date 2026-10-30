# Project architecture — Practical 1, Part 2: My first neural network

This document explains **how** the requirements in `spec.md` are implemented: files, libraries, components, data flow and design decisions. Every function in the notebook appears here, with the requirement (FR) it serves.

## 1. File structure

```
Task 2/
├── spec.md            # What the system must do
├── architecture.md    # How it is organized (this file)
├── tasks.md           # What to do, in order, with progress marks
├── aiRules.md         # How the AI assistant works with the student
├── log.md             # Chronological record of decisions and changes
└── practical1.ipynb   # The whole implementation
```

All the code lives in **one notebook**, with no separate `.py` modules. The project is small (around ten functions), and the assignment asks for a notebook run top to bottom, so splitting it into modules would add imports and file switching without making anything clearer.

## 2. Libraries

| Library | Used for | Not used for |
| --- | --- | --- |
| `autograd.numpy` (as `anp`) | Everything the gradient flows through: forward pass, softmax, loss | — |
| `autograd` | `value_and_grad`: the loss value and its gradient in one call | — |
| `numpy` (as `np`) | Data preparation, random numbers, metrics, checks (code that is never differentiated) | The forward pass or the loss |
| `sklearn.datasets` | `load_digits` | — |
| `sklearn.model_selection` | `train_test_split` (stratified) | Any model, scaler or metric |
| `matplotlib.pyplot` | Curves and the prediction grid | — |

Install once: `pip install numpy autograd scikit-learn matplotlib jupyter`. The standard-library `time` module is used to time training (task 4.2).

**Rule:** a function that `autograd` must differentiate uses only `anp` operations and never modifies an array in place (e.g. no `W[0, 0] = ...`), because `autograd` cannot trace in-place assignment. Plain `np` is fine elsewhere.

## 3. Notebook structure

The notebook has one section per phase of `tasks.md`. Each section starts with a Markdown cell explaining what follows. Each code cell ends with the task's checks written as `assert` statements (each with a message), after printing the values involved.

| Section | Content | Functions defined |
| --- | --- | --- |
| 0. Setup | Imports, configuration, configuration check | `validate_config` |
| 1. Data | Load, split, standardize, one-hot | `load_data`, `fit_standardizer`, `apply_standardizer`, `one_hot` |
| 2. Model | Parameters, forward pass, prediction | `init_params`, `check_params`, `relu`, `log_softmax`, `forward`, `predict_proba`, `predict`, `accuracy` |
| 3. Loss and gradients | Cross-entropy, gradient, gradient check | `cross_entropy`, `loss_and_grad`, `gradient_check` |
| 4. Training | Mini-batches, SGD step, training loop | `check_batch`, `iterate_minibatches`, `sgd_step`, `train` |
| 5. Evaluation and visualization | Test accuracy, curves, prediction grid, error analysis, learning-rate experiment | `plot_history`, `show_prediction_grid`, `confusion_matrix`, `plot_confusion_matrix`, `run_lr_experiment`, `plot_lr_experiment` |
| 6. Robustness | Triggers every error case of FR7 and prints the message; final checks | `expect_error` |

## 4. Components

### 4.0 Configuration (section 0)

One dictionary holds every setting, so nothing is hard-coded inside the functions:

```python
CONFIG = {
    "seed": 0,
    "test_size": 0.2,
    "layer_sizes": [64, 64, 10],
    "learning_rate": 0.1,
    "batch_size": 32,
    "epochs": 30,
}
```

- `validate_config(config)` → `None`. Raises `ValueError` if a key is missing, `learning_rate <= 0`, `batch_size` or `epochs` is not an integer ≥ 1 (a value like `32.0` would otherwise fail later with a cryptic slicing error), or `test_size` is not in (0, 1). (FR7)

### 4.1 Data (section 1) — FR1

- `load_data()` → `X` (1797, 64) float64, `y` (1797,) int.
- Split: `train_test_split(X, y, test_size=0.2, stratify=y, random_state=seed)` → `X_train_raw` (1437, 64), `X_test_raw` (360, 64), `y_train`, `y_test`. The raw (unstandardized) images are kept for the prediction grid.
- `fit_standardizer(X_train)` → `mean` (64,), `std` (64,). Entries of `std` equal to 0 are replaced by 1 (4 pixels are always 0 in the training set).
- `apply_standardizer(X, mean, std)` → `(X − mean) / std`, same shape as `X`. Applied to train and test with the **training** statistics.
- `one_hot(y, num_classes=10)` → `Y` (N, 10). Checks first that every label is an integer in 0–9 (FR7).

### 4.2 Model (section 2) — FR2

**Parameter representation.** A Python list with one `(W, b)` tuple per layer:

```python
params = [(W1, b1), (W2, b2)]
```

`autograd` differentiates with respect to nested lists and tuples of arrays and returns the gradient **with exactly the same structure**, so `grads[0][0]` is ∂L/∂W1. The list works for any number of layers, given by `layer_sizes`.

**Convention.** One sample per row. A layer computes `Z = A @ W + b` with `A` (B, n_in), `W` (n_in, n_out), `b` (n_out,), so `b` is broadcast over the B rows.

- `init_params(layer_sizes, rng)` → `params`. Validates `layer_sizes` (at least 2 positive integers). Weights ~ N(0, 2 / n_in) (He initialization), biases = 0.
- `check_params(params, n_features)` → `None`. Raises a clear `ValueError` if the first weight's rows ≠ `n_features`, or if a weight's rows ≠ the previous layer's outputs, or if a bias size ≠ its weight's columns. (FR7)
- `relu(Z)` → `anp.maximum(Z, 0)`.
- `log_softmax(Z)` → `Z − m − log Σₖ exp(Zₖ − m)` with `m = max(Z, axis=1)`. Subtracting the row maximum doesn't change the result but keeps every exponent ≤ 0, so `exp` cannot overflow. (FR2.3)
- `forward(params, X)` → **logits** `Z` (B, 10): for each hidden layer `A = relu(A @ W + b)`; the last layer is affine only. Calls `check_params` first.
- `predict_proba(params, X)` → `exp(log_softmax(forward(params, X)))`, shape (B, 10), rows sum to 1.
- `predict(params, X)` → `argmax` of the logits, shape (B,).
- `accuracy(params, X, y)` → fraction of `predict(params, X) == y`.

### 4.3 Loss and gradients (section 3) — FR3, FR4

- `cross_entropy(params, X, Y)` → scalar
  `L = −mean over rows of Σₖ Yₖ · log_softmax(forward(params, X))ₖ`.
  It works on **log-probabilities computed from the logits**, never on `log(p)`. This way `log(0)` cannot happen: a very wrong prediction gives a large but finite loss. (FR3.3)
- `loss_and_grad = value_and_grad(cross_entropy, 0)`
  → `(L, grads)` for `(params, X, Y)`. The `0` means: differentiate with respect to argument 0, `params`. `X` and `Y` are treated as constants.
- `gradient_check(params, X, Y, rng, n_checks=5, eps=1e-5)` → list of relative errors (also printed). For `n_checks` entries θᵢ, cycling through W1, b1, W2, b2, … so every parameter array is tested, at a random position chosen with `rng`, it compares the autograd value with the finite-difference value `(L(θ + ε·eᵢ) − L(θ − ε·eᵢ)) / 2ε`. Relative error = `|a − n| / max(|a|, |n|, 1e-8)`. It works on copies of the parameters (the in-place change is outside `autograd`, so it is allowed). (FR4.4)

**What is differentiated, with respect to what, and why.** For a mini-batch `(X_b, Y_b)`, the loss is a scalar function of the parameters only:

```
L(θ) = cross_entropy(θ; X_b, Y_b),   θ = (W1, b1, W2, b2)
```

`autograd` records the operations of `cross_entropy` and applies the chain rule backwards (reverse mode, i.e. backpropagation) to get ∂L/∂W1, ∂L/∂b1, ∂L/∂W2, ∂L/∂b2. We differentiate with respect to θ, and not X or Y, because θ is what training changes: the data are fixed, and the gradient says how to move each parameter to reduce the loss on this batch.

### 4.4 Training (section 4) — FR5

- `check_batch(X, Y)` → `None`. Raises `ValueError` for an empty batch or for `X` and `Y` with different numbers of rows. (FR7)
- `iterate_minibatches(n, batch_size, rng)` → yields index arrays: a random permutation of `0 … n−1`, cut into consecutive slices of `batch_size` (the last one may be smaller).
- `sgd_step(params, grads, lr)` → **new** list `[(W − lr·dW, b − lr·db), …]`. It builds new arrays instead of changing the old ones.
- `train(params, X_train, Y_train, X_test, Y_test, config, verbose=True)` → `(params, history)`:
  1. `validate_config(config)`; `rng = np.random.default_rng(seed + 1)` for shuffling.
  2. For each epoch, for each mini-batch: `check_batch`, `L, grads = loss_and_grad(params, X_b, Y_b)`; if `L` is not finite, raise `ValueError` with the epoch and batch number (FR5.4); else `params = sgd_step(params, grads, lr)`.
  3. At the end of the epoch, compute loss and accuracy on the full train and test sets, append them to `history`, and print one line if `verbose` (the learning-rate experiment sets it to `False`).

  `history = {"train_loss": [...], "train_acc": [...], "test_loss": [...], "test_acc": [...]}`, one value per epoch.

The test set is only **measured**, never used for updates or to choose anything during training.

### 4.5 Evaluation and visualization (section 5) — FR6

- Final test accuracy: `accuracy(trained_params, X_test, y_test)`, printed as a percentage, with the number of wrong images; the predictions are kept as `y_test_pred` for the grid and the confusion matrix.
- `plot_history(history)` → two side-by-side plots: loss vs. epoch and accuracy vs. epoch, train (solid blue) and test (dashed orange), with titles, labels and legends; the epoch of minimum test loss is marked on the loss plot.
- `show_prediction_grid(X_raw, y_true, y_pred, n=16)` → `fig`: a 4 × 4 grid of the first `n` test images (raw pixels reshaped to 8 × 8, grayscale), titled `✓ pred p / true t`, or `✗ …` in red when wrong. It returns the figure so the check can count the red titles.
- `confusion_matrix(y_true, y_pred, num_classes=10)` → `C` (10, 10) int, where `C[i, j]` counts test images of class `i` predicted as `j`. Built with `np.add.at(C, (y_true, y_pred), 1)`. Per-class accuracy is `diag(C) / C.sum(axis=1)`. The cell also lists the confused pairs and, with `predict_proba`, the confidence of the network on its mistakes. (FR6.5)
- `plot_confusion_matrix(C)` → heatmap (`imshow`) with the count written in each cell, axes labelled "Predicted" and "True".
- `run_lr_experiment(learning_rates, X_train, Y_train, X_test, Y_test, config)` → `results`, a dict `{lr: {"history": …, "test_acc": …}}` or `{lr: {"diverged": message}}`. For each rate it copies `config` with only `learning_rate` changed, creates **new** parameters with `init_params` and the same seed, and calls `train(..., verbose=False)`. The `ValueError` raised by a divergent run is caught and stored. Runs inside `np.errstate(over="ignore", invalid="ignore")`, because overflow is the expected behaviour of a too-large learning rate here. It never touches the main `params`. (FR6.6)
- `plot_lr_experiment(results)` → a summary table (printed) and one plot of the train-loss curves of the completed runs, log-scale y-axis.

### 4.6 Robustness (section 6) — FR7

Validation is **built into each function from the start** (it is part of the task that writes the function), because a check added only at the end would require editing cells that already work. Section 6 then demonstrates every case:

- `expect_error(description, function, *args)` → calls the function, catches the `ValueError` and prints `description → message`; prints a warning if no error was raised.

| FR7 case | Raised by |
| --- | --- |
| Input features ≠ first layer | `check_params` (from `forward`) |
| Incompatible consecutive layers | `check_params` |
| Invalid layer sizes | `init_params` |
| Empty mini-batch | `check_batch` |
| `X` and `Y` row counts differ | `check_batch` |
| Label out of range / not integer | `one_hot` |
| Invalid hyperparameter | `validate_config` |
| `NaN`/`Inf` loss | `train` |

## 5. Data flow and shapes

```
load_digits ─► X (1797,64), y (1797,)
   │ train_test_split (80/20, stratified)
   ▼
X_train_raw (1437,64)            X_test_raw (360,64)
   │ fit_standardizer ─► mean, std ─┐
   ▼                                ▼
X_train (1437,64) ◄─ apply ─►  X_test (360,64)
y_train ─ one_hot ─► Y_train (1437,10)     y_test ─► Y_test (360,10)

Training, per mini-batch of B rows (B = 32, last batch 29):
X_b (B,64) ─► @W1 (64,64) + b1 (64,) ─► relu ─► H (B,64)
           ─► @W2 (64,10) + b2 (10,) ─► Z logits (B,10)
           ─► log_softmax ─► with Y_b (B,10) ─► L (scalar)
L ─► value_and_grad wrt params ─► grads [(dW1,db1),(dW2,db2)] ─► sgd_step ─► new params
```

Parameter count: 64·64 + 64 + 64·10 + 10 = **4,810**. Per epoch: ⌈1437 / 32⌉ = 45 updates.

## 6. Design decisions

| Decision | Choice | Reason |
| --- | --- | --- |
| Architecture | 64 → 64 → 10 | One hidden layer is enough for 8 × 8 digits; a hidden size equal to the input size is a simple, common choice. |
| Activation | ReLU | Simple, fast, and doesn't saturate for positive inputs, so gradients don't vanish as with tanh. |
| Output | Softmax + cross-entropy, computed as log-softmax | Gives a probability distribution over 10 classes; the log-softmax form is numerically stable. |
| Parameter representation | List of `(W, b)` tuples | `autograd` returns the gradient in the same structure, and it scales to any number of layers. |
| Weight initialization | He: N(0, 2 / n_in); biases 0 | Keeps the signal variance roughly constant through ReLU layers, so training starts well. |
| Normalization | Standardization, train statistics only; std 0 → 1 | Features on the same scale make SGD better conditioned; train-only statistics avoid test leakage. |
| Learning rate | 0.1 | Reaches a train loss near 0 within 30 epochs while staying well below the rates where training becomes unstable (≈ 2 in the prototype). Larger rates converge faster on this dataset but are closer to divergence. Chosen from training behaviour, not from test accuracy. |
| Mini-batch size | 32 | A good balance between noisy updates and speed; 45 updates per epoch. |
| Epochs | 30 | The training loss is near 0 by then; more epochs add nothing. |
| Seed | 0 (split and init); 1 (shuffling) | Reproducible results (spec §6). |
| Float type | float64 | `load_digits` default; needed for an accurate finite-difference check. |
| Metrics per epoch | Full train and test sets | Smoother, comparable curves (not the noisy average of batch losses). |
| Checks | `assert` statements in each cell | "Run all" fails loudly when a requirement breaks, instead of relying on someone reading the printed values. |
| Learning-rate experiment | 0.001, 0.01, 0.1, 1.0, 5.0; same seeds; new parameters per run | Spans too slow → good → unstable/divergent, so each regime is visible. Only the learning rate changes, so differences are caused by it. Illustrative only: the configured value is not changed from its results. |

**Preliminary check of the hyperparameters.** Before writing this document, the assistant ran a quick prototype of this design (same architecture, initialization and standardization; one shared seed for initialization and shuffling, so the final notebook numbers may differ slightly) to choose the values:

| Learning rate | Batch size | Epochs | Train acc. | Test acc. | Final train loss |
| --- | --- | --- | --- | --- | --- |
| **0.1** | **32** | **30** | **100 %** | **98.1 %** | **0.012** |
| 0.05 | 32 | 30 | 99.9 % | 97.2 % | 0.029 |
| 0.1 | 64 | 50 | 100 % | 97.8 % | 0.015 |
| 0.01 | 32 | 50 | 98.3 % | 96.1 % | 0.094 |

All runs took about 1–2 s. The test accuracy column is shown for information only: the choice was made from the training behaviour (see the learning-rate row above), so the test set stays an unbiased estimate. In the same prototype, learning rates 0.5 and 1.0 also trained well, 2.0 made the loss explode (~10⁶³) without producing `NaN`, and 5.0 produced `NaN` at epoch 8. These values are a starting point; any change is recorded in `log.md`.

## 7. How to run

Open the `Task 2` folder in VSCode (with the Jupyter extension) or start `jupyter notebook` in it, open `practical1.ipynb`, and choose **Restart kernel and run all**. No files are downloaded.
