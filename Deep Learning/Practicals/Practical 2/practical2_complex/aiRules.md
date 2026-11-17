# Working rules for the AI assistant

## Context: why these rules exist

The user designs the solution in the project documents, and the AI assistant implements it with them, **one task at a time**, editing the notebook cells directly.

The goal is not only a notebook that runs. The user must be able to **explain every line** of it and every number it reports: how the data is simulated, what each model outputs, where the conservation law enters, what is differentiated, and what each experiment shows. So the assistant is a careful, transparent collaborator who keeps the user in control and never makes design decisions alone.

When a rule below conflicts with going faster, follow the rule.

## 1. Source documents and priority

| File | Contains |
| --- | --- |
| `spec.md` | What the notebook must do: requirements (FR), checks, acceptance criteria |
| `architecture.md` | How it is organized: sections, functions, shapes, design decisions, expected results |
| `tasks.md` | What to do and in what order, with progress marks |
| `aiRules.md` | How the assistant works (this file) |
| `log.md` | What was decided and changed, and why |
| `A1_Phase_A_Group_Exercise.ipynb` | The Phase A plan (read-only), in this same folder |

If two documents conflict, follow this order:

1. An explicit instruction from the user in the current conversation.
2. `aiRules.md`
3. `spec.md`
4. `architecture.md`
5. `tasks.md`

When you find a conflict, a gap or an ambiguity, **don't resolve it silently**: point to the exact sections, propose a fix and wait for the user's decision.

## 2. Start of every session

Conversations can be interrupted, so don't rely on memory of earlier sessions:

1. Read `spec.md`, `architecture.md`, `tasks.md`, `aiRules.md`, `log.md` and the Phase A notebook.
2. Read `A1_Phase_B_Individual_Exercise.ipynb` as it is now.
3. From `tasks.md`, find which tasks are `[x]` and which one is next.
4. Give the user a short summary: what is done, what comes next, any problem found in the documents.
5. Wait for the user's confirmation before starting.

## 3. Task workflow

Each task in `tasks.md` follows these five steps. Never work on more than one task at a time.

### Step 1 — Plan

A few bullet points, before any code:

- What the task does and which requirement it serves (FR number).
- Which cells you will complete or add, and the functions with their signatures and shapes, as in `architecture.md`.
- How it will be checked (the task's **Check**), and for training tasks, how long it should take.

If the task needs a decision that the documents don't cover, stop after the plan and ask.

### Step 2 — Implement

- Complete the template's stubs in place, keeping its class names, signatures and section order. New cells go in the section the task names.
- First a Markdown cell explaining what the block does and why, then the code cell(s).
- Write only what this task needs. No code for later tasks.
- Don't modify cells from earlier tasks unless necessary; if it is, say which cell and why, and record it in `log.md`.
- Every function gets a short docstring: purpose, inputs with shapes, output.
- Each code cell ends with the task's **Check** as `assert` statements with a clear message, after printing the values involved. Never weaken an assert to make it pass: if it fails, report it.

### Step 3 — Verify

- Run the notebook top to bottom and read the **actual** output.
- Confirm the task's Check passes and the earlier cells still work.
- Compare the numbers with `architecture.md` §7. A large difference is a finding to report, not something to fix by tuning.
- If something can't be verified by the assistant, say so and give the user exact steps.

Report honestly: if a check fails or only partly passes, show the output and say so. Never call a task done without having seen it work.

### Step 4 — Self-review

Re-read the new cells and check:

- **Correctness:** shapes, the axis of every mean, the sign of every term in the balance, which arrays are raw and which are normalized.
- **Leakage:** see §5.
- **Simplicity:** the simplest code that can be followed; no clever one-liners.
- **Explainability:** non-obvious lines have a comment saying *why*.

### Step 5 — Close and stop

1. Mark the task `[x]` in `tasks.md`, only if it was verified.
2. If anything was decided or changed during the task, add an entry to `log.md` (and update `spec.md` / `architecture.md` with the user's approval). Always log the headline numbers of a finished training task.
3. Report in this format:

   ```
   ✅ Task X.Y — <name>

   What was done: <1–3 sentences>
   Cells added/changed: <list>
   Verified: <what was run and the result, with the key numbers>
   How you can check it: <what to run and what to look at>
   Key concepts: <1–3 bullets on the important ideas>
   Open issues: <or "none">
   ```

4. **Stop and wait.** Don't start the next task until the user explicitly says so ("ok", "next", "continue"). A question or comment is not a confirmation: answer it and wait again.

## 4. Scope and changes

- Only add functions, libraries or experiments that appear in the documents or that the user approved in the conversation.
- Don't modify `spec.md` or `architecture.md` on your own. Propose the change; the user approves it. The only change to `tasks.md` without asking is marking tasks `[x]`.
- A bug or improvement outside the current task goes to "Open issues", not into the code.
- Don't change the Phase A notebook. Don't delete files other than the cache in `results/`, and don't run git commands that change history unless the user asks.

## 5. Technical rules for this project

### Allowed tools

- `jax`, `flax.linen`, `optax`, `numpy`, `matplotlib`, and the standard library (`time`, `os`, `zlib`).
- No PyTorch, TensorFlow, Keras or scikit-learn.

### Physics and data

- **`c(t)` never leaks.** `C` is not a model input, not part of any batch, not in any loss, and not used to choose anything (including `μ`). It appears only in diagnostics after training.
- **Raw units for the balance.** `((m + r) − q) − ĉ + δ` uses the unnormalized `m, r, q`. Only the LSTM input is normalized. Keep that order of operations in the models and in the metrics.
- **Split by sequence**, never by time step. Statistics come from the training sequences actually used in that run.
- **The test set is only measured.** Model selection (best epoch, `μ`) uses the validation set.
- **Identical conditions.** Every run shares hidden size, optimizer, clipping, learning rate, epochs, batch size and loss, except the one factor its experiment changes. Never tune one model separately.
- **The unmetered inflow is hidden from everyone.** In the incomplete-physics experiment it is in no feature and in no model's equation.

### JAX

- **Keys.** Every random call gets its own key by splitting; run keys come from the seed and the run name (`architecture.md` §4.0). Never reuse a key.
- **Pure functions.** Losses, steps and validation functions have no side effects and don't modify arrays in place. No Python `if` on array values inside jitted code.
- **One compilation per run.** Build the jitted step and validation function once per run, outside the epoch loop.
- Convert losses to Python floats before storing them; convert results to NumPy before caching.

### Reporting results

- **Describe what was measured.** Option 4's conservation is approximate; never call its physical error guaranteed. A baseline with zero violations on the test set has not been shown to be safe: say it is zero *on this set*.
- **Don't present `ĉ` alone as the recovered consumption** when `δ` is not near zero; use `ĉ − δ` and say why.
- **Keep the claim the size of the evidence.** Three seeds give a rough spread, not a significance test. One shifted test set shows one kind of shift.
- **Warning signs** — a loss that doesn't go down, `NaN`, an Option 3 physical error that is not exactly 0, a result far from `architecture.md` §7 — are reported with a reasoned explanation (normalized units in the balance, leakage, wrong axis, a reused key), never hidden.
- Interpretations are written **after** the numbers exist, and cite them.

When a task touches one of these points, explain it in "Key concepts".

## 6. Communication

- Clear, simple English. Explain deep learning and JAX ideas briefly and accurately when they appear.
- Be concise: don't repeat the plan in the report, don't paste whole cells the user can read in the notebook.
- If unsure about an API or a requirement, say so instead of guessing.
- If the user asks for something that contradicts the documents, point it out once, then follow their decision and record it in `log.md`.
- The reflection answers are the user's to write. Provide the notes of task 6.1 only.

## 7. When to stop and ask

- A requirement is ambiguous, or the documents disagree. If asking, expect a coherent response from the user; don't continue without one.
- The task needs something not described in the documents.
- `spec.md` or `architecture.md` would have to change.
- A check fails and the fix would change the agreed design.
- A result contradicts `architecture.md` §7 in direction, not just in size.
- A task is much bigger or slower than expected: propose splitting it in `tasks.md`.
- A task is finished (always).
