# Rules for the AI assistant

## General rules

1. **Read first.** At the start of a session, read all the `.md` files, the notebook and the Phase A plan (`../A1_Phase_A_Group_Exercise.ipynb`), say which task is next, and wait.
2. **One task at a time**, in the order of `tasks.md`. Never start the next task until the user says so.
3. **Plan, then code.** State in 2–3 lines what the task adds; ask if something isn't covered by the documents.
4. **Keep it simple.** Complete the template's stubs in place, keeping its class names, signatures and section order. Short functions with a one-line docstring, short Markdown cells, one or two asserts per cell. No code for future tasks, no extra experiments.
5. **Verify honestly.** Run the notebook and report the real output. If something fails or looks wrong (a `NaN`, a loss that doesn't drop, a result far from `architecture.md` "Expected results"), say so and explain why. Never adjust a check to make it pass.
6. **Report briefly:** what was added, what was checked, one or two key concepts. Then mark the task `[x]` and add one line to `log.md`.
7. **Don't change** `spec.md` or `architecture.md` without the user's approval.

## Technical rules for this project

### Allowed tools

- `jax`, `flax.linen`, `optax`, `numpy`, `matplotlib`, `time`.
- No PyTorch, TensorFlow, Keras or scikit-learn.

### Physics and data

- **`c(t)` never leaks.** `C` is not a model input, not part of any batch, not in any loss. It is used only in the diagnostics of section 8.
- **Raw units for the balance.** `m + r − q − ĉ + δ` uses the unnormalized `m, r, q`. Only the LSTM input is normalized.
- **Split by sequence**, never by time step. Normalization statistics (`x_mean`, `x_std`, `y_mean`, `y_std`) come from the training split only.
- **Identical conditions.** Both models share hidden size, optimizer, learning rate, epochs, batch size and loss (MSE on `m(t+1)` in physical units). Never tune one model separately.
- **Report Option 4 as it is.** Its conservation is approximate. Do not describe its physical error as guaranteed zero, and do not present `ĉ` alone as the recovered consumption when `δ` is not near zero.

### JAX

- **Keys.** Every random call gets its own sub-key from `key, sub = jax.random.split(key)`. Never reuse a key.
- **Pure functions.** Loss and step functions have no side effects and don't modify arrays in place. No Python `if` on array values inside jitted code.
- **One compilation per model.** Build the jitted step once with `make_train_step` and reuse it; don't create it inside the epoch loop.
- Convert losses to Python floats (`float(loss)`) before storing or printing them.

## Communication

- Clear, simple English. Explain deep learning and JAX ideas briefly and accurately when they appear.
- Be concise: don't repeat the plan in the report, don't paste whole cells the user can read in the notebook.
- If unsure about an API or a requirement, say so instead of guessing.
- If the user asks for something that contradicts the documents, point it out once, then follow their decision and record it in `log.md`.
- The reflection answers are the user's to write. Provide the notes of task 5.1 only.

## When to stop and ask

- A requirement is ambiguous, or the documents disagree. If asking, expect a coherent response from the user; don't continue without one.
- The task needs something not described in the documents.
- `spec.md` or `architecture.md` would have to change.
- A check fails and the fix would change the agreed design.
- A task is much bigger than expected: propose splitting it in `tasks.md`.
- Always when a task is finished.
