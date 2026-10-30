# Log

## 2026-10-28
- Started Task 2.1 as a simpler version of Task 2. Task 2 worked (98.06 % test accuracy) but the notebook and documents were too long and over-validated.
- Kept: same network (64 → 64 ReLU → 10), hyperparameters, standardization and seeds; the confusion matrix.
- Removed: gradient check, learning-rate experiment, configuration validation and the extra input checks. Errors are now limited to the four cases in `spec.md` R8.
- Checks: printed values plus one or two asserts per cell. Markdown cells limited to 2–4 lines.
- Wrote `spec.md`, `architecture.md`, `tasks.md`, `aiRules.md`.
- Student added technical, communication and stop-and-ask sections to `aiRules.md`.
- **0.1 done.** Notebook skeleton: title, 7 headings, imports, `CONFIG`. Runs without errors.
- **1.1 done.** Load, stratified split, `standardize` (train statistics only). Shapes (1437, 64) / (360, 64); max |mean| of training features 6.8e-16.
- **1.2 done.** `one_hot` with the R8 label check. Shapes (1437, 10) / (360, 10); argmax recovers the labels; labels 12 and -1 raise the message.
- **2.1 done.** `init_params` (He init, zero biases). Shapes W1 (64, 64), b1 (64,), W2 (64, 10), b2 (10,); 4,810 parameters.
- **2.2 done.** `forward` (with the R8 dimension check), `log_softmax`, `predict`, `accuracy`. Probabilities sum to 1; untrained accuracy 14.3 %.
- **3.1 done.** `cross_entropy` (anp only, from log_softmax). Equal logits give 2.3026 = ln 10; untrained loss 2.7872.
- **3.2 done.** `loss_and_grad = value_and_grad(cross_entropy, 0)`. On 32 images: loss 2.8251; gradient shapes match the parameters; norms dW1 2.03, db1 0.26, dW2 2.24, db2 0.28.
- **4.1 done.** `train_step` (empty-batch check, gradient, update) and `train` (shuffle, batches, NaN check, history; progress printed every 5 epochs). Train loss 0.3462 → 0.0120; test accuracy 90.3 % → 98.1 %. Same numbers as Task 2.
- **5.1 done.** Final test accuracy 98.06 % (7 of 360 wrong); `plot_history` shows loss and accuracy, train solid vs. test dashed.
- Student ran tasks 0.1–5.1 on their machine: same outputs as the assistant's run.
- **5.2 done.** `show_predictions`: 4 × 4 grid of raw test images, ✓/✗ titles, wrong in red. 15 of 16 correct; the error is an 8 predicted as 1. Visual check only (no assert).
- **5.3 done.** `plot_confusion_matrix` (returns the matrix) and a 3-line interpretation. Sums to 360; trace / 360 = 98.06 %. Weakest class 8 (94.3 %, both errors predicted as 1); 1 ↔ 8 causes 3 of 7 errors.
- **6.1 code done.** The four R8 cases each print their `ValueError` message (dimension mismatch, empty batch, label 12, NaN at epoch 8 with learning rate 5.0). The diverging run's warnings and progress lines are hidden in that cell only. Full notebook runs in about 4 s with no warnings. Waiting for the student's final "Restart and run all" to mark 6.1 [x].

## 2026-10-29
- Student compared Task 2.1 (a much more simple one) with Task 2.0 (a previous, more ambitious one) and asked to bring back: the gradient check, printing every epoch, and fuller explanations for the key concepts only (not for simple steps).
- Updated `spec.md` (R4 adds the finite-difference check; R5 prints every epoch; Markdown constraint allows up to ~8 lines for key concepts), `architecture.md` (`gradient_check`; `train` prints every epoch) and `tasks.md`.
- Student decided not to add the changes as a separate Phase 7, but to **remake Task 2.1 from scratch** with them built in: `tasks.md` rewritten (gradient check is task 3.3, per-epoch printing is part of 4.1, key-concept tasks marked ★ get fuller explanations), all tasks reset to `[ ]`. The first-pass notebook will be replaced in task 0.1.
- **0.1 done (remake).** Fresh notebook replaces the first pass: title, 7 headings, imports, `CONFIG`. Runs without errors.
- **1.1 done.** Load, stratified split, `standardize` (train statistics only). Shapes (1437, 64) / (360, 64); max |mean| 6.8e-16.
- **1.2 done.** `one_hot` with the R8 label check. Shapes (1437, 10) / (360, 10); argmax recovers the labels.
- **2.1 done.** ★ `init_params` with a fuller explanation (parameter structure, symmetry breaking, why 2 / n_in). 4,810 parameters.
- **2.2 done.** ★ `forward` (R8 dimension check), `log_softmax`, `predict`, `accuracy`, with a fuller explanation (equations, why ReLU, logits vs. probabilities, overflow). Probabilities sum to 1; untrained accuracy 14.3 %.
- **3.1 done.** ★ `cross_entropy` with a fuller explanation (formula, negative log-probability of the true class, reference values, why log-softmax, why params first). Equal logits 2.3026 = ln 10; untrained 2.7872.
- **3.2 done.** ★ `loss_and_grad` with the what/with-respect-to-what/why/how explanation. Batch loss 2.8251; gradient shapes match; norms 2.03 / 0.26 / 2.24 / 0.28.
- **3.3 done.** `gradient_check` (central finite differences, eps 1e-5, entries cycling through W1, b1, W2, b2). Max relative error 3.6e-08 < 1e-4.
- **4.1 done.** ★ `train_step` and `train`, one line per epoch (train/test loss and accuracy), with a fuller explanation (epoch steps, update rule and its sign, why mini-batches). Train loss 0.3462 → 0.0120; test accuracy 90.3 % → 98.1 %.
- **5.1 done.** ★ Final test accuracy 98.06 % (7 of 360 wrong) and `plot_history`, with a fuller explanation of how to read the curves (loss going down, train/test gap, overfitting signature).
- **5.2 done.** `show_predictions`: 4 × 4 grid; 15 of 16 correct (an 8 predicted as 1, in red).
- **5.3 done.** `plot_confusion_matrix` and a short interpretation. Trace / 360 = 98.06 %; weakest class 8 (94.3 %); 1 ↔ 8 causes 3 of 7 errors.
- Student ran tasks 0.1–5.3 on their machine: all outputs match the assistant's run.
- **6.1 code done.** The four R8 cases print their messages (diverging run's warnings and progress hidden in that cell only); full notebook runs without errors or warnings. 6.1 will be marked [x] after the student's final "Restart and run all".
- **6.1 done.** Student's final "Restart and run all": all 13 code cells ran in order (1–13), no errors, all outputs saved, including the loss curves, the final test accuracy and the four R8 messages.

## Final result
Test accuracy 98.06 % (353/360) with a 64 → 64 (ReLU) → 10 (softmax) MLP, mini-batch SGD (η = 0.1, batch 32, 30 epochs), gradients from `autograd` verified by finite differences (max relative error 3.6e-08). All 13 tasks done; the notebook matches `spec.md` and `architecture.md`.
