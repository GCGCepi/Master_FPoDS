# Project tasks — Practical 1, Part 2: My first neural network

Rules:

- Do **one task at a time**, in order, following `aiRules.md`. After each task, mark it `[x]` and wait for the student's confirmation.
- Each task adds one or more cells to `practical1.ipynb`, in the section of its phase: a Markdown cell explaining the block, then the code cell(s).
- **After every task, "Restart kernel and run all" must work** with no errors. Cells from later tasks don't exist yet.
- Each task has a **Check**. The check is written in the code cell as `assert` statements (so a failure stops "Run all" with a message), and the cell also prints the values involved so the student can read them. The task is done only when the asserts pass.
- Function names, signatures and shapes follow `architecture.md`; the requirement IDs (FR) refer to `spec.md`.
- Any change to the plan is recorded in `log.md`.

## Phase 0 — Setup

- [x] **0.1** Create `practical1.ipynb` with a title cell (what the notebook does, how to run it) and one Markdown heading per section (0–6, `architecture.md` §3). In section 0: imports (`autograd.numpy as anp`, `numpy as np`, `value_and_grad`, `load_digits`, `train_test_split`, `matplotlib`), the `CONFIG` dictionary and `validate_config`.
  - Check: the seven section headings are visible; the library versions and the configuration are printed; `validate_config(CONFIG)` raises nothing.

## Phase 1 — Data (FR1)

- [x] **1.1** `load_data`, then the stratified 80/20 split with the seed; keep the raw test images.
  - Check: `X (1797, 64)`, `y (1797,)`, pixel range 0–16; train `(1437, 64)`, test `(360, 64)`; the class proportions of the two sets differ by less than 1 percentage point.
- [x] **1.2** `fit_standardizer` and `apply_standardizer`, fitted on the training set only.
  - Check: the number of constant features is printed; non-constant training features have |mean| < 1e-6 and |std − 1| < 1e-6; constant features are 0; no `NaN`/`Inf` in either set.
- [x] **1.3** `one_hot` with label validation; build `Y_train` and `Y_test`.
  - Check: shapes `(1437, 10)` and `(360, 10)`; `argmax(Y) == y`; every row sums to 1.

## Phase 2 — Model (FR2)

- [x] **2.1** `init_params` (with layer-size validation) and `check_params`.
  - Check: shapes `(64, 64)`, `(64,)`, `(64, 10)`, `(10,)`; 4,810 parameters in total; biases are 0; the std of each weight matrix is within 10 % of √(2/n_in).
- [x] **2.2** `relu`, `log_softmax`, `forward`, `predict_proba`, `predict` and `accuracy`.
  - Check: on 5 training rows the probabilities have shape `(5, 10)`, lie in [0, 1] and rows sum to 1 (tolerance 1e-6); logits of size ~1000 still give finite probabilities that sum to 1; the untrained accuracy on the training set is printed and is near chance (between 0 % and 30 %).

## Phase 3 — Loss and gradients (FR3, FR4)

- [x] **3.1** `cross_entropy`, written only with `anp`.
  - Check: logits that are all equal give `ln 10 ≈ 2.3026` (tolerance 1e-9); confident correct logits give < 1e-6; the untrained loss on the training set is finite and between 1 and 5.
- [x] **3.2** `loss_and_grad = value_and_grad(cross_entropy, 0)`.
  - Check: on one mini-batch, each gradient has the same shape as its parameter; every gradient norm is > 0; no `NaN`/`Inf`.
- [x] **3.3** `gradient_check`.
  - Check: for 5 random parameter entries, autograd vs. finite-difference values are printed, and every relative error is < 1e-4.

## Phase 4 — Training (FR5)

- [x] **4.1** `check_batch`, `iterate_minibatches` and `sgd_step`.
  - Check: one epoch of indices has 45 batches (the last of size 29) and covers every training index exactly once; one `sgd_step` on a batch lowers that batch's loss.
- [x] **4.2** `train`: epochs, mini-batches, `NaN`/`Inf` stop, history and one progress line per epoch. Run it with `CONFIG`.
  - Check: 30 progress lines; the last train loss is lower than the first and lower than 0.1; the history has 30 values per metric; training takes under 1 minute.

## Phase 5 — Evaluation and visualization (FR6)

- [x] **5.1** Final test accuracy.
  - Check: the test accuracy is printed as a percentage and is ≥ 90 %.
- [x] **5.2** `plot_history`: loss and accuracy curves, train and test.
  - Check: two plots inline, with titles, axis labels and legends; the loss curves go down.
- [x] **5.3** `show_prediction_grid`: 4 × 4 test images with predicted and true labels, wrong ones in red.
  - Check: the grid renders; the number of red titles equals the number of wrong predictions among those 16 images.
- [x] **5.4** Error analysis: `confusion_matrix`, per-class accuracy, `plot_confusion_matrix`, and a Markdown cell interpreting the results (most confused digit pairs, weakest classes, train–test gap).
  - Check: the matrix is 10 × 10, sums to 360, each row sums to that class's test count, and its trace / 360 equals the test accuracy of 5.1; the interpretation cites the actual numbers.
- [x] **5.5** Learning-rate experiment: `run_lr_experiment` and `plot_lr_experiment` for learning rates 0.001, 0.01, 0.1, 1.0 and 5.0 (all other settings from `CONFIG`), and a Markdown cell interpreting the results.
  - Check: one row per learning rate in a summary table (final train loss and test accuracy, or "diverged" with the epoch); the train-loss curves of the completed runs on one plot (log scale); the trained model from Phase 4 is unchanged (same test accuracy as 5.1).

## Phase 6 — Robustness and final checks (FR7, spec §7)

- [x] **6.1** `expect_error` and one call for each case in the FR7 table.
  - Check: 8 lines, each showing a case and its clear message; an assert confirms every case raised a `ValueError`; the notebook keeps running after the section.
- [x] **6.2** Final review: "Restart kernel and run all", tick the acceptance criteria in `spec.md` §7, check that `spec.md` and `architecture.md` match the code, and update `log.md`.
  - Check: every criterion in `spec.md` §7 is ticked and the notebook is saved with all outputs visible.
