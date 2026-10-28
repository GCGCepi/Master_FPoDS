# Project specification — Practical 1, Part 2: My first neural network

## 1. Objective

Build a Jupyter notebook, `practical1.ipynb`, that trains a **multilayer perceptron (MLP) written from scratch** to classify the handwritten digits of the scikit-learn **Digits** dataset (8×8 images, 10 classes).

The student writes the parameters, the forward pass, the loss and the training loop. The only automatic part is the gradient computation, done by `autograd`. The notebook must make every step of learning visible and checkable: shapes, probabilities, loss values, gradients, curves and predictions.

## 2. Scope

### In scope

- Loading and preparing the Digits dataset.
- An MLP with at least one hidden layer, a nonlinear activation and a 10-class softmax output.
- Cross-entropy loss and its gradient with `autograd`.
- Training with mini-batch stochastic gradient descent (SGD).
- Evaluation on a held-out test set, training curves and a prediction grid.
- Error analysis: confusion matrix and per-class accuracy.
- A learning-rate experiment that shows how the learning rate affects training.
- Clear error messages for invalid inputs.

### Out of scope

- Deep learning frameworks (PyTorch, TensorFlow, Keras) and scikit-learn models.
- Hand-derived gradients (backpropagation written by hand).
- Validation set, systematic hyperparameter search, regularization, other optimizers (momentum, Adam), GPUs.
- Choosing any setting from test-set results. The learning-rate experiment (FR6.6) is **illustrative**: it does not change the configured learning rate.
- Saving or loading trained models.

## 3. Inputs

| Input | Source | Description |
| --- | --- | --- |
| Images `X` | `sklearn.datasets.load_digits` | 1,797 × 64 array, pixel values are integers 0–16 |
| Labels `y` | `sklearn.datasets.load_digits` | 1,797 integers in {0, …, 9} |
| Configuration | One notebook cell | Seed, test fraction, layer sizes, learning rate, batch size, number of epochs. Values are fixed in `architecture.md` §5. |

No files are downloaded or read from disk.

## 4. Outputs

All outputs appear inline in the notebook when it is run top to bottom:

- Printed shapes and sanity checks after each phase.
- A per-epoch progress line during training (epoch, train loss, train accuracy, test loss, test accuracy).
- The final test accuracy, printed as a percentage.
- A loss curve and an accuracy curve (train and test vs. epoch).
- A grid of test images with predicted and true labels.
- A confusion matrix, per-class accuracy and a written interpretation.
- A learning-rate comparison: a summary table, a plot of training-loss curves and a written interpretation.
- The messages produced by the error-handling checks.

## 5. Functional requirements

Each requirement has an ID and a **Check** that decides whether it is met.

### FR1 — Data loading and preparation

- **FR1.1 Load.** Load the Digits dataset as `X` (float, shape (1797, 64)) and `y` (integer, shape (1797,)).
  - Check: the printed shapes are `(1797, 64)` and `(1797,)`; the pixel range is 0–16.
- **FR1.2 Split.** Split into 80 % train and 20 % test, **stratified by class**, with a fixed seed.
  - Check: shapes are train `(1437, 64)` and test `(360, 64)`; every class appears in both sets in roughly the same proportion; running the cell twice gives the same split.
- **FR1.3 Standardize.** Standardize each of the 64 pixel features: `x' = (x − mean) / std`, where mean and std are computed **on the training set only** and then applied to both sets (no information from the test set is used). Features whose training std is 0 (pixels that are always 0) are divided by 1 instead, so no division by zero happens.
  - Check: on the training set, every non-constant feature has mean ≈ 0 and std ≈ 1 (tolerance 1e-6); constant features are 0; neither set contains `NaN` or `Inf`.
- **FR1.4 One-hot.** Convert the labels to one-hot matrices of shape (N, 10).
  - Check: every row has exactly one 1 and nine 0s, and `argmax` of each row returns the original label.

### FR2 — The model

- **FR2.1 Parameters.** Create the weights and biases of every layer from a list of layer sizes. For a layer with `n_in` inputs and `n_out` outputs, the weight matrix has shape (`n_in`, `n_out`) and the bias has shape (`n_out`,). Initialization is random (with the seed) for weights and zero for biases.
  - Check: the notebook prints the shape of every parameter and the total number of parameters (for 64 → 64 → 10: 4,810).
- **FR2.2 Forward pass.** A function maps a batch of inputs (B, 64) and the parameters to class probabilities (B, 10): each hidden layer applies an affine map followed by the nonlinear activation; the output layer applies an affine map followed by softmax.
  - Check: on a random batch, the output has shape (B, 10), all values are in [0, 1], and every row sums to 1 (tolerance 1e-6).
- **FR2.3 Numerical stability.** Softmax must not overflow: inputs that produce very large logits (e.g. 1000) still give finite probabilities.
  - Check: a test with large logits gives no `NaN`/`Inf` and rows still sum to 1.
- **FR2.4 Prediction.** A function returns the predicted class (the `argmax` of the probabilities) and another returns the accuracy (fraction of correct predictions).

### FR3 — Loss function

- **FR3.1** The loss is the **mean cross-entropy** over a batch: `L = −(1/B) Σᵢ Σₖ Yᵢₖ · log pᵢₖ`, where `Y` is one-hot and `p` the predicted probabilities.
- **FR3.2** The loss is written only with `autograd.numpy` operations, so `autograd` can differentiate it.
- **FR3.3** The loss is numerically stable: it never returns `NaN` or `Inf` for finite inputs (log of 0 must be avoided).
  - Check: uniform predictions (all probabilities 0.1) give `L = ln 10 ≈ 2.3026`; perfect confident predictions give `L ≈ 0`; the loss of the untrained network on the training set is finite and of the order of ln 10.

### FR4 — Gradients with autograd

- **FR4.1** The gradient of the loss is obtained with `autograd.grad`, **with respect to the network parameters only** (not the data or the labels). Nothing is derived by hand.
- **FR4.2** The gradient has exactly the same structure and shapes as the parameters.
  - Check: shapes printed side by side match.
- **FR4.3** The gradient is finite and not all zero.
  - Check: no `NaN`/`Inf`; the norm of every gradient array is printed and is > 0.
- **FR4.4** The gradient is correct.
  - Check: for 5 parameter entries (at least one in each weight and bias array, at random positions), the autograd value agrees with a finite-difference estimate `(L(θ+ε) − L(θ−ε)) / 2ε` with relative error < 1e-4.

### FR5 — Training

- **FR5.1** Train with mini-batch SGD: in each epoch, shuffle the training set (with the seed), split it into consecutive mini-batches of the configured size (the last batch may be smaller), and for each batch update every parameter as `θ ← θ − η · ∂L/∂θ`.
- **FR5.2** After every epoch, compute and store in a history: train loss, train accuracy, test loss and test accuracy, each measured on the **full** set with the current parameters. The test set is never used to update the parameters.
- **FR5.3** Print one progress line per epoch.
- **FR5.4** If the loss becomes `NaN` or `Inf`, stop training immediately with a clear message (see FR7) instead of continuing.
  - Check: the train loss after the last epoch is lower than after the first epoch, and the curve goes down overall; training finishes in less than 1 minute on a standard laptop.

### FR6 — Evaluation and visualization

- **FR6.1** Print the final test accuracy as a percentage.
  - Check: test accuracy ≥ 90 % (target from the assignment).
- **FR6.2** Plot the loss curve (train and test) vs. epoch, with title, axis labels and legend, and mark the epoch with the lowest test loss.
- **FR6.3** Plot the accuracy curve (train and test) vs. epoch, with title, axis labels and legend.
- **FR6.4** Show a grid of at least 16 test images (4 × 4) with the predicted and true label above each image; wrong predictions are highlighted (e.g. red title).
  - Check: the plots render inline; the number of red titles equals the number of wrong predictions among the images shown.
- **FR6.5 Error analysis.** Compute the 10 × 10 confusion matrix of the test set (rows: true class, columns: predicted class) with `numpy`, the accuracy of each class, and show the matrix as a heatmap with the counts written in the cells. Also report the confused pairs and how confident the network is on its mistakes. A Markdown cell interprets the results: the most confused pairs of digits, the weakest classes and the gap between train and test accuracy.
  - Check: the matrix sums to 360, each row sums to the number of test images of that class, and its trace divided by 360 equals the test accuracy of FR6.1.
- **FR6.6 Learning-rate experiment.** Train a new network for each learning rate in {0.001, 0.01, 0.1, 1.0, 5.0}, with every other setting (seeds, architecture, batch size, epochs) taken from the configuration, so the learning rate is the only difference. Show:
  - a table with, for each learning rate, the final train loss and test accuracy, or "diverged at epoch k" if training stopped because of `NaN`/`Inf` (FR5.4);
  - one plot with the train-loss curve of every completed run, epochs on the x-axis and a logarithmic y-axis;
  - a Markdown cell explaining what the curves show (too small: slow learning; good: fast and stable; too large: unstable or divergent).

  Runs that diverge are expected here: they are reported in the table, not raised as errors, and the overflow warnings they produce are silenced only inside this experiment, with a comment explaining why.
  - Check: the table has one row per learning rate; the main model trained in FR5 is not modified (its test accuracy is the same before and after the experiment).

### FR7 — Error handling

Invalid inputs must raise a `ValueError` with a message that says **what** is wrong, **where**, and the **expected vs. received** value. No cryptic NumPy broadcasting error may reach the user. Cases that must be detected:

| Case | Example message |
| --- | --- |
| Input features don't match the first layer | `Input has 63 features, but the first layer expects 64.` |
| Consecutive layers have incompatible shapes | `Layer 2 weight has 32 input rows, but layer 1 outputs 64 values.` |
| Fewer than 2 layer sizes, or a size < 1 | `Layer sizes must be at least [input, output] with positive integers, got [64].` |
| Empty mini-batch | `Empty mini-batch: received 0 samples.` |
| Inputs and labels with different numbers of rows | `X has 32 rows but Y has 31 rows.` |
| Label outside 0–9 or not an integer | `Label 12 at index 5 is out of range; labels must be integers in 0–9.` |
| Invalid hyperparameter (learning rate ≤ 0, batch size < 1, epochs < 1, test fraction not in (0, 1)) | `Learning rate must be > 0, got -0.1.` |
| Loss becomes `NaN`/`Inf` during training | `Training stopped at epoch 7, batch 12: the loss is NaN. Try a lower learning rate.` |

- Check: a dedicated notebook section triggers each case above, catches the error and prints its message; the rest of the notebook is unaffected.

## 6. Non-functional requirements

- **Libraries.** Only `numpy`, `autograd`, `scikit-learn` (only for loading the data and the train/test split) and `matplotlib`.
- **Reproducibility.** One seed controls the split, the initialization and the shuffling. Running the notebook twice gives the same numbers.
- **Organization.** The notebook has one section per phase (`tasks.md`), with Markdown cells explaining each block of code before it.
- **Code quality.** Every function has a short docstring (purpose, inputs with shapes, output). Clear names; no dead code.
- **Language.** All code, comments, Markdown and documents are in English.
- **Runtime.** The whole notebook runs top to bottom in under 1 minute on a standard laptop, CPU only.
- **Automatic checks.** Every **Check** in this document is written in the notebook as `assert` statements, so "Run all" stops with a message if a requirement is broken. The values involved are also printed.

## 7. Acceptance criteria

The project is complete when all of the following are true:

- [x] The notebook runs top to bottom without errors after "Restart kernel and run all", with all outputs visible, and every `assert` passes.
- [x] FR1: shapes (1797, 64) → (1437, 64) / (360, 64); standardization statistics from train only; one-hot rows correct.
- [x] FR2: parameter shapes printed (4,810 parameters); probabilities sum to 1, also with large logits.
- [x] FR3: uniform predictions give ln 10; the initial loss is finite.
- [x] FR4: gradient shapes match the parameters, gradients are finite and non-zero, and the finite-difference check passes.
- [x] FR5: the training loss decreases; the history contains 4 values per epoch.
- [x] FR6: test accuracy ≥ 90 %; loss curve, accuracy curve and prediction grid are shown.
- [x] FR6.5: confusion matrix consistent with the test accuracy, per-class accuracy and a written interpretation.
- [x] FR6.6: learning-rate table and plot, with a written interpretation; the main model is unchanged.
- [x] FR7: every error case in the table produces its clear message.
- [x] `spec.md`, `architecture.md` and `tasks.md` describe the code that was actually written; every change during development is recorded in `log.md`.
