# Development log

Chronological record of decisions and changes to the specification, architecture and code. Each entry says what changed, why, and which documents were updated.

## 2026-10-28 — Initial decisions (before any code)

Questions raised by the AI assistant after reading the assignment, and the student's answers:

| Topic | Decision |
| --- | --- |
| Network | 64 → 64 (ReLU) → 10 (softmax) |
| Normalization | Standardization (mean 0, std 1) with statistics from the training set only, instead of dividing by 16 |
| Split | 80 % train / 20 % test, stratified, fixed seed; no validation set |
| Hyperparameters | Proposed by the AI assistant, open to adjustment (see `architecture.md`) |
| Metrics per epoch | Loss and accuracy on both train and test |
| Error handling | Raise `ValueError` with clear messages; a notebook section demonstrates each case |
| Process evidence | This `log.md` file records every change |
| Language | English everywhere |

- Wrote `spec.md` (version 1).
- Wrote `architecture.md` (version 1). Hyperparameters (learning rate 0.1, batch 32, 30 epochs) chosen from a quick prototype run by the assistant; results recorded in `architecture.md` §6.
- Design decision: input validation is written inside each function as it is created; Phase 6 only demonstrates the error cases (`architecture.md` §4.6).
- Student approved `architecture.md` v1, including `gradient_check` and the seeds (0 for split and initialization, 1 for shuffling).
- Wrote `tasks.md` (version 1): Phase 0 (setup) added before the six proposed phases, because the imports and `CONFIG` are needed by every later cell.
- Wrote `aiRules.md` (version 1), adapted from the Practical 0 rules to a notebook implemented with Claude (Cowork mode).

## 2026-10-28 — Review of the plan for master's level

The student asked whether the plan was appropriate for an MSc. The assistant proposed, and the student approved:

- **Merged trivial tasks** (19 → 18 tasks): old 0.1 + 0.2 → 0.1 (notebook skeleton with setup); old 1.1 + 1.2 → 1.1 (load and split); old 2.2 + 2.3 → 2.2 (forward pass with prediction and accuracy).
- **Checks as `assert` statements** instead of printed values only, so "Run all" fails loudly. Added to `spec.md` §6, `architecture.md` §3 and §6, `aiRules.md` §3, and every check in `tasks.md` now has a numeric threshold.
- **New FR6.5, error analysis** (task 5.4): confusion matrix, per-class accuracy, written interpretation.
- **New FR6.6, learning-rate experiment** (task 5.5): rates 0.001, 0.01, 0.1, 1.0, 5.0. A quick prototype run by the assistant showed 5.0 diverges (`NaN` at epoch 8) and 2.0 explodes without `NaN`, so the set covers every regime. `train` gains a `verbose` flag; new functions `run_lr_experiment`, `plot_lr_experiment` (`architecture.md` §4.5).
- **Test-set discipline made explicit:** the learning rate 0.1 is justified by training behaviour, not test accuracy, and the experiment is illustrative only (`spec.md` §2, `architecture.md` §6).
- Rejected as out of scope: Adam, regularization, validation set.
- Considered letting the notebook read a CSV file (`training_log.csv`, a Part 1 training log). Decision: **the only data source is `sklearn.datasets.load_digits`**, as the assignment requires; no CSV input. The documents already say this (`spec.md` §3), so they are unchanged.

## 2026-10-28 — Implementation

- **Task 0.1 done.** Notebook skeleton: title, section headings 0–6, imports, `CONFIG`, `validate_config`. Verified by executing the notebook (no errors) and by calling `validate_config` with 8 invalid configurations (each gave its message). `validate_config` also rejects missing keys and non-integer batch size / epochs (e.g. `32.0`), which would otherwise cause a cryptic error later; proposed adding this to `architecture.md` §4.0.
- **Task 1.1 done.** `load_data` and the stratified 80/20 split (`X_train_raw`, `X_test_raw`, `y_train`, `y_test`). Verified: notebook runs, all asserts pass; largest train/test class-proportion difference 0.19 percentage points; the split is identical across runs and the 1-point threshold also holds for seeds 1–3.
- Student approved the `validate_config` extension; `architecture.md` §4.0 updated.
- Note: the first save of task 1.1 did not reach the student's folder (the old notebook was written instead). Found when preparing task 1.2 and fixed by saving again; from now on the saved file is checked on disk after each task.
- **Task 1.2 done.** `fit_standardizer` / `apply_standardizer`, fitted on `X_train_raw` only. Verified: 4 constant training pixels (0, 24, 32, 39) handled with std 1; non-constant training features have |mean| < 2e-16 and std 1.000000; no NaN/Inf. Two test values at those pixels are non-zero (max 1.0), so they stay finite and small after standardization.
- Student ran tasks 0.1–1.2 on their machine (numpy 2.4.6, scikit-learn 1.9.0): all asserts pass, same outputs as the assistant's run.
- **Task 1.3 done.** `one_hot` with label validation; `Y_train` (1437, 10), `Y_test` (360, 10). Verified: argmax recovers the labels, rows sum to 1; invalid inputs tested: 12 and −1 (out of range), 3.5 (not an integer), a 2-D array — each gives a clear message. Float labels with whole values (e.g. `2.0`) are accepted. The −1 case matters: without the check, NumPy indexing would silently map it to class 9.
- **Task 2.1 done.** `init_params` (He initialization, zero biases, layer-size validation) and `check_params` (shape chaining). Verified: shapes (64, 64), (64,), (64, 10), (10,); 4,810 parameters; std(W) 0.1763 and 0.1755 vs. target 0.1768. Invalid inputs tested: layer sizes [64], [64, 0, 10], [64, 32.0, 10], []; 63 input features; a layer-2 weight with 32 rows; a bias of the wrong size — each gives its message. A 3-layer network [64, 32, 16, 10] passes `check_params`, so the code is not tied to one hidden layer. `check_params` also checks bias size (not listed in FR7; it covers the same kind of shape error).
- **Task 2.2 done.** `relu`, `log_softmax`, `forward` (returns logits, calls `check_params`), `predict_proba`, `predict`, `accuracy`. Verified: probabilities (5, 10) in [0, 1], rows sum to 1; logits of size 1000 give `NaN` with the naive softmax but correct probabilities with `log_softmax` (both shown in the notebook as a demonstration); untrained training accuracy 14.3 %; 63 input features raise the FR7 message; a gradient can be taken through `forward` (preview of section 3).
- **Task 3.1 done.** `cross_entropy(params, X, Y)` from `log_softmax(forward(...))`, `anp` only. Verified: all-zero parameters give exactly ln 10 = 2.302585; a confident correct 1-layer network gives 0; a confident wrong one gives 100.00 (large but finite: shows why the loss is computed from log-softmax, not log of probabilities; this case was added beyond the planned check); untrained loss 2.7872.
- **Task 3.2 done.** `loss_and_grad = value_and_grad(cross_entropy, 0)`. Verified on the first 32 training images: loss 2.8251 (same as `cross_entropy`); gradient shapes equal parameter shapes; norms dW1 2.0308, db1 0.2608, dW2 2.2420, db2 0.2770, all finite. Edge case (outside the notebook): with all-zero parameters only db2 is non-zero (dW1 = db1 = dW2 = 0), which confirms why the weights need random initialization (symmetry breaking, task 2.1).
- **Task 3.3 done.** `gradient_check`: central finite differences (ε = 1e-5) vs. autograd on 5 entries. Verified: max relative error 3.6e-08 (threshold 1e-4). Changes from `architecture.md` §4.3, proposed to the student: (1) the entries cycle through W1, b1, W2, b2, W1 with a random position, instead of fully random choices (a first run picked b2[6] twice and never b1 or W2); (2) the function returns the list of relative errors, so the cell can assert on them; (3) argument order `(params, X, Y, rng, n_checks, eps)`.
- Student approved the `gradient_check` changes; `architecture.md` §4.3 updated.
- Student ran tasks 0.1–3.3 on their machine: every cell ran without errors.
- **Task 4.1 done.** `check_batch`, `iterate_minibatches`, `sgd_step`. Verified: 45 batches per epoch (44 × 32 + 29), covering each training index exactly once; one SGD step with lr 0.1 lowers the batch loss from 2.5729 to 2.1192. Invalid inputs tested: empty batch and 32 vs. 31 rows give the FR7 messages; n smaller than the batch size gives a single smaller batch.
- **Task 4.2 done.** `train` with history, NaN/Inf stop and per-epoch progress; run with `CONFIG` into `trained_params, history` (the untrained `params` are kept unchanged). Verified: train loss 0.3462 → 0.0120, train accuracy 100 % from epoch 18, test accuracy 90.3 % → 98.1 %; 1.1 s. NaN stop tested with learning rate 5.0: "Training stopped at epoch 8, batch 31: the loss is nan." Observation: the test loss reaches its minimum (0.2323) at epoch 22 and then rises slightly to 0.2362 while test accuracy stays at 98.1 %: a mild overfitting signal, to be discussed in task 5.4.
- **Task 5.1 done.** Final test accuracy 98.06 % (353 of 360 correct, 7 wrong), equal to the last value in `history`; train accuracy 100 %. `y_test_pred` is kept for the grid and the confusion matrix.
- **Task 5.2 done.** `plot_history`: loss and accuracy side by side, train solid blue / test dashed orange (colorblind-safe pair, distinguishable without color), with the epoch of minimum test loss marked (an addition to the planned check, to support the overfitting discussion). Verified: plot rendered and inspected; train loss 0.3462 → 0.0120, test loss 0.4908 → min 0.2323 at epoch 22 → 0.2362.
- **Task 5.3 done.** `show_prediction_grid`: first 16 test images (raw pixels, 8 × 8), "pred / true" titles, wrong ones in red with ✗ (correct ones ✓, so not color alone). Returns the figure so the check can count red titles. Verified: grid rendered and inspected; 1 wrong among the 16 (an 8 predicted as 1), 1 red title.
- **Task 5.4 done.** `confusion_matrix` (with `np.add.at`), `plot_confusion_matrix` (heatmap with counts), per-class accuracy, most confused pairs, confidence on mistakes, and a Markdown interpretation. Verified: matrix sums to 360, rows match class counts, trace / 360 = 98.06 %; heatmap rendered and inspected. Findings: 7 errors; 8 is the weakest class (94.3 %, both errors predicted as 1); the 1 ↔ 8 pair accounts for 3 of 7 errors; the mistakes are confident (mean top probability 0.93, true class ≤ 0.10), which explains why the test loss stays far above the train loss. The confidence analysis (with `predict_proba`) was added beyond the planned check. The interpretation cites the numbers of the seed-0 run.
- **Task 5.5 done.** `run_lr_experiment` and `plot_lr_experiment`, plus a Markdown interpretation. Verified: final train loss / test accuracy: 0.001 → 0.9172 / 80.28 %; 0.01 → 0.1464 / 95.28 %; 0.1 → 0.0120 / 98.06 % (identical to the main model, same seeds); 1.0 → 0.0004 / 97.50 % with an unstable jump at epoch 5; 5.0 → diverged (NaN at epoch 8, batch 31), caught and reported in the table. No warnings printed; main model and `CONFIG` unchanged. Colors validated with the colorblind-safety script (all checks pass; the low-contrast warning for aqua/yellow is covered by the legend, end-of-line labels and the table). Extra assert: the 0.1 run reproduces the main model.
- **Task 6.1 done.** `expect_error` and the 8 FR7 cases. Verified: each case raises a `ValueError` with the message given in `spec.md` FR7 (identical wording); the trained model is unchanged afterwards; no warnings printed.
- **Task 6.2 done (final review).** Fresh "Restart and run all" in the assistant's environment: 45 cells (18 code, 27 Markdown), no errors, no warnings, about 10 s in total. Code audit: all 27 functions have docstrings; the differentiated functions (`relu`, `log_softmax`, `forward`, `predict_proba`, `cross_entropy`) use only `anp`; no TODOs. Every function in the notebook is described in `architecture.md`.
- Documentation brought in line with the code: `architecture.md` §2 (`time` module), §4.5 (`plot_history` marks the minimum test loss; `show_prediction_grid` returns the figure, ✓/✗ titles; confidence analysis in FR6.5; `trained_params` and `y_test_pred`); `spec.md` FR4.4 (entries cover every parameter array), FR6.2 (minimum test-loss marker), FR6.5 (confused pairs and confidence on mistakes). All acceptance criteria in `spec.md` §7 ticked.
- Remaining step for the student: "Restart kernel and run all" in VSCode and save, so the submitted notebook contains their own outputs (loss curve and final test accuracy visible).

## Final result

Test accuracy 98.06 % (353/360) with a 64 → 64 (ReLU) → 10 (softmax) MLP trained by mini-batch SGD (η = 0.1, batch 32, 30 epochs), gradients from `autograd`, verified against finite differences (max relative error 3.6e-08).
