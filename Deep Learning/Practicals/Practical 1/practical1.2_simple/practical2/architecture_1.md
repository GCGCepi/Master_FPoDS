# Architecture

## Files

```
Task 2.1/
├── spec.md, architecture.md, tasks.md, aiRules.md, log.md
└── practical1.ipynb      # all the code, one section per phase
```

## Network

```
X (B, 64) ─► X @ W1 + b1 ─► ReLU ─► H (B, 64) ─► H @ W2 + b2 ─► logits Z (B, 10) ─► log-softmax ─► loss
              W1 (64, 64), b1 (64,)                 W2 (64, 10), b2 (10,)
```

Parameters are a list of `(W, b)` tuples: `params = [(W1, b1), (W2, b2)]` (4,810 numbers). `autograd` returns the gradient with the same structure.

## Functions

| Section | Function | Does |
| --- | --- | --- |
| 1. Data | `standardize(X_train, X_test)` | Scales both sets with the training mean and std (std 0 → 1). |
| | `one_hot(y)` | (N,) → (N, 10). Raises if a label is outside 0–9. |
| 2. Model | `init_params(layer_sizes, rng)` | He initialization: W ~ N(0, 2 / n_in), b = 0. |
| | `forward(params, X)` | Returns the logits. Raises if a layer's input size doesn't match. |
| | `log_softmax(Z)` | Stable: subtracts the row maximum before `exp`. |
| | `predict(params, X)`, `accuracy(params, X, y)` | Class = argmax of the logits; fraction correct. |
| 3. Loss | `cross_entropy(params, X, Y)` | `-mean(sum(Y * log_softmax(forward(params, X))))`. |
| | `loss_and_grad` | `value_and_grad(cross_entropy, 0)`: loss and gradient with respect to `params` (argument 0). |
| | `gradient_check(params, X, Y, rng, n_checks=5, eps=1e-5)` | Compares autograd with central finite differences on entries cycling through W1, b1, W2, b2; returns the relative errors. Perturbs copies of the parameters. |
| 4. Training | `train_step(params, X_b, Y_b, lr)` | Raises on an empty batch; computes loss and gradient; returns `θ − lr · grad` and the loss. |
| | `train(params, data, config)` | Epoch loop: shuffle, mini-batches, `train_step`; raises if the loss is `NaN`; records the history and prints one line per epoch (train/test loss and accuracy). |
| 5. Results | `plot_history(history)` | Loss and accuracy curves, train vs. test. |
| | `show_predictions(X_raw, y_true, y_pred)` | 4 × 4 grid of raw test images, wrong ones in red. |
| | `plot_confusion_matrix(y_true, y_pred)` | 10 × 10 counts (`np.add.at`) as a heatmap. |
| 6. Errors | — | One cell with `try/except` for the four R8 cases. |

Functions the gradient flows through (`forward`, `log_softmax`, `cross_entropy`) use only `autograd.numpy` (`anp`); the rest uses plain `numpy` (`np`).

**What is differentiated:** the mini-batch loss L(θ), a scalar, with respect to θ = (W1, b1, W2, b2). The data are constants; the parameters are what training changes.

## Design decisions

| Decision | Choice | Why |
| --- | --- | --- |
| Hidden layer | 1 layer, 64 units, ReLU | Enough for 8 × 8 digits; ReLU doesn't saturate. |
| Initialization | He, biases 0 | Keeps activations at a stable scale through ReLU. |
| Normalization | Standardize, train statistics only | Better-conditioned SGD; no test leakage. |
| Learning rate | 0.1 | Fast and stable; 5.0 diverges (checked in a prototype for Task 2). |
| Batch size / epochs | 32 / 30 | 45 updates per epoch; the loss is near 0 by epoch 30. |
| Seed | 0 (split, init), 1 (shuffle) | Reproducible. |

`CONFIG = {"seed": 0, "test_size": 0.2, "layer_sizes": [64, 64, 10], "learning_rate": 0.1, "batch_size": 32, "epochs": 30}`
