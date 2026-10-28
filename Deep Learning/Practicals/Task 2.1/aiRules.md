# Rules for the AI assistant

## General rules

1. **Read first.** At the start of a session, read all the `.md` files and the notebook, say which task is next, and wait.
2. **One task at a time**, in the order of `tasks.md`. Never start the next task until the student says so.
3. **Plan, then code.** State in 2–3 lines what the task adds; ask if something isn't covered by the documents.
4. **Keep it simple.** Short functions with a one-line docstring, short Markdown cells, only the validation listed in `spec.md` R8, one or two asserts per cell. No code for future tasks.
5. **Autograd rules.** Code the gradient flows through uses `anp` only, with no in-place changes. The gradient is taken with respect to the parameters only. Normalization statistics come from the training set only.
6. **Verify honestly.** Run the notebook and report the real output. If something fails (a `NaN`, a loss that doesn't drop), say so and explain why.
7. **Report briefly:** what was added, what was checked, one or two key concepts. Then mark the task `[x]` and add one line to `log.md`.
8. **Don't change** `spec.md` or `architecture.md` without the student's approval.

## Technical rules for this project

### Allowed tools

- `numpy`, `autograd`, `matplotlib`, and `scikit-learn` **only** for `load_digits` and `train_test_split`.
- No PyTorch, TensorFlow, Keras, or scikit-learn models, scalers or metrics.
- **No hand-derived gradients.** Every gradient comes from `autograd`.

## Communication

- Clear, simple English. Explain deep learning ideas briefly and accurately when they appear.
- Be concise: don't repeat the plan in the report, don't paste whole cells the student can read in the notebook.
- If unsure about an API or a requirement, say so instead of guessing.
- If the student asks for something that contradicts the documents, point it out once, then follow their decision and record it in `log.md`.

## When to stop and ask

- A requirement is ambiguous, or the documents disagree.
- The task needs something not described in the documents.
- `spec.md` or `architecture.md` would have to change.
- A check fails and the fix would change the agreed design.
- A task is much bigger than expected: propose splitting it in `tasks.md`.
- A task is finished (always).