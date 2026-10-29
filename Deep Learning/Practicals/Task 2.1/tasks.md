# Tasks

One task at a time (see `aiRules.md`). Each task adds a Markdown cell and a code cell; mark it `[x]` when its check passes. Markdown follows `spec.md`: 2–4 lines for simple steps, up to about 8 lines for the key concepts (marked ★ below).

## Phase 0 — Setup
- [x] **0.1** Notebook with title and section headings; imports and `CONFIG`. *Check: imports work, config printed.*

## Phase 1 — Data
- [x] **1.1** Load, stratified split, `standardize`. *Check: shapes (1437, 64) / (360, 64); training features have mean ≈ 0.*
- [x] **1.2** `one_hot`. *Check: shapes (1437, 10) / (360, 10); argmax gives back the labels.*

## Phase 2 — Model
- [x] **2.1** ★ `init_params` (He initialization). *Check: shapes of W1, b1, W2, b2; 4,810 parameters.*
- [x] **2.2** ★ `log_softmax`, `forward`, `predict`, `accuracy` (forward pass, ReLU, stable softmax). *Check: probabilities sum to 1; untrained accuracy ≈ 10 %.*

## Phase 3 — Loss and gradients
- [x] **3.1** ★ `cross_entropy`. *Check: equal logits give ln 10; untrained loss is finite.*
- [x] **3.2** ★ `loss_and_grad` (what is differentiated, with respect to what). *Check: gradient shapes match the parameters; finite and non-zero.*
- [x] **3.3** `gradient_check`. *Check: relative errors < 1e-4 on 5 entries.*

## Phase 4 — Training
- [x] **4.1** ★ `train_step` and `train` (mini-batch SGD, the update rule); run training, one line per epoch. *Check: 30 progress lines; the training loss goes down.*

## Phase 5 — Results
- [x] **5.1** ★ Final test accuracy and `plot_history` (reading the curves). *Check: test accuracy ≥ 90 %; curves visible.*
- [x] **5.2** `show_predictions`. *Check: 4 × 4 grid, wrong predictions in red.*
- [x] **5.3** `plot_confusion_matrix` and a short interpretation. *Check: diagonal / 360 = test accuracy.*

## Phase 6 — Errors and final check
- [x] **6.1** The four R8 error cases; then "Restart and run all" and save with outputs. *Check: four clear messages; every requirement in `spec.md` met.*
