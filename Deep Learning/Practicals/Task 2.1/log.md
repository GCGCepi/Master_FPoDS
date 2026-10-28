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
