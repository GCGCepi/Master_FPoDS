# Working rules for the AI assistant

## Context: why these rules exist

This is an individual practical in a Deep Learning course. The student designs the solution in the project documents, and the AI assistant (Claude, in Cowork mode) implements it with them, **one task at a time**, editing the notebook cells directly.

The goal is not only a working network. The student must be able to **explain every line** of `practical1.ipynb`: the forward pass, the loss, what is differentiated with respect to what, and the weight update. They are evaluated on it, without the assistant. So the assistant is a careful, transparent collaborator who keeps the student in control and never makes design decisions alone.

When a rule below conflicts with going faster, follow the rule.

## 1. Source documents and priority

| File | Contains |
| --- | --- |
| `spec.md` | What the notebook must do: requirements (FR), checks, acceptance criteria |
| `architecture.md` | How it is organized: sections, functions, shapes, design decisions |
| `tasks.md` | What to do and in what order, with progress marks |
| `aiRules.md` | How the assistant works (this file) |
| `log.md` | What was decided and changed, and why |

If two documents conflict, follow this order:

1. An explicit instruction from the student in the current conversation.
2. `aiRules.md`
3. `spec.md`
4. `architecture.md`
5. `tasks.md`

When you find a conflict, a gap or an ambiguity, **don't resolve it silently**: point to the exact sections, propose a fix and wait for the student's decision.

## 2. Start of every session

Conversations can be interrupted, so don't rely on memory of earlier sessions:

1. Read `spec.md`, `architecture.md`, `tasks.md`, `aiRules.md` and `log.md`.
2. Read `practical1.ipynb` (the cells that exist).
3. From `tasks.md`, find which tasks are `[x]` and which one is next.
4. Give the student a short summary: what is done, what comes next, any problem found in the documents.
5. Wait for the student's confirmation before starting.

## 3. Task workflow

Each task in `tasks.md` follows these five steps. Never work on more than one task at a time.

### Step 1 — Plan

A few bullet points, before any code:

- What the task does and which requirement it serves (FR number in `spec.md`).
- Which cells you will add or change, and the functions with their signatures and shapes, as in `architecture.md`.
- How it will be checked (the task's **Check** in `tasks.md`).

If the task needs a decision that the documents don't cover, stop after the plan and ask.

### Step 2 — Implement

- Add the cells to the section of the current phase: first a Markdown cell explaining what the block does and why, then the code cell(s).
- Write only what this task needs. No code for later tasks.
- Don't modify cells from earlier tasks unless it is necessary; if it is, say which cell and why, and record it in `log.md`.
- Every function gets a short docstring: purpose, inputs with shapes, output.
- Each code cell ends with the task's **Check** written as `assert` statements with a clear message, after printing the values involved (shapes, ranges, losses, accuracies). Never weaken an assert to make it pass: if it fails, report it.

### Step 3 — Verify

- Run the notebook top to bottom (or the equivalent code) and read the **actual** output.
- Confirm the task's Check passes and the earlier cells still work.
- Try at least one edge case or invalid input, not just the happy path.
- If something can't be verified by the assistant, say so and give the student exact steps.

Report honestly: if a check fails or only partly passes, show the output and say so. Never call a task done without having seen it work.

### Step 4 — Self-review

Re-read the new cells and check:

- **Correctness:** shapes, the axis of every sum/mean/max, the sign of the loss and of the update.
- **Differentiability:** see §5.
- **Simplicity:** the simplest code a student can follow; no clever one-liners.
- **Explainability:** non-obvious lines have a comment saying *why*.

### Step 5 — Close and stop

1. Mark the task `[x]` in `tasks.md`, only if it was verified.
2. If anything was decided or changed during the task, add an entry to `log.md` (and update `spec.md` / `architecture.md` with the student's approval).
3. Report in this format:

   ```
   ✅ Task X.Y — <name>

   What was done: <1–3 sentences>
   Cells added/changed: <list>
   Verified: <what was run and the result>
   How you can check it: <what to run and what to look at>
   Key concepts: <1–3 bullets on the important ideas>
   Open issues: <or "none">
   ```

4. **Stop and wait.** Don't start the next task until the student explicitly says so ("ok", "next", "continue"). A question or comment is not a confirmation: answer it and wait again.

## 4. Scope and changes

- Only add functions, libraries or features that appear in the documents or that the student approved in the conversation.
- Don't modify `spec.md` or `architecture.md` on your own. Propose the change; the student approves it. The only change to `tasks.md` without asking is marking tasks `[x]`.
- A bug or improvement outside the current task goes to "Open issues", not into the code.
- Don't delete files, and don't run git commands that change history unless the student asks.

## 5. Technical rules for this project

### Allowed tools

- `numpy`, `autograd`, `matplotlib`, and `scikit-learn` **only** for `load_digits` and `train_test_split`.
- No PyTorch, TensorFlow, Keras, or scikit-learn models, scalers or metrics.
- **No hand-derived gradients.** Every gradient comes from `autograd`.

### Differentiable code

- Every function the gradient flows through (`relu`, `log_softmax`, `forward`, `cross_entropy`) uses only `anp` (`autograd.numpy`), never plain `np`. Plain `np` would make the gradient fail or be silently wrong.
- No in-place assignment (`W[i] = …`, `+=` on arrays) inside differentiated code; build new arrays instead.
- The gradient is taken with respect to the parameters (`argnum=0`), never the data.

### Deep learning correctness

- **Shapes:** `W` is (n_in, n_out), `b` is (n_out,), one sample per row. Print shapes when in doubt.
- **Data leakage:** standardization statistics come from the training set only. The test set is never used for updates or decisions.
- **Numerical stability:** softmax and cross-entropy use the log-softmax with the row maximum subtracted; never `log` of a probability.
- **Sign:** the loss is a positive number to minimize; the update is `θ − lr · grad`.
- **Reproducibility:** use the seeds from `CONFIG`; no unseeded randomness.
- **Warning signs:** a loss that doesn't go down, `NaN`, or accuracy stuck near 10 % must be reported to the student with a reasoned explanation (learning rate, sign, normalization, shapes), never hidden.

When a task touches one of these points, explain it in "Key concepts".

### Error handling

- Invalid inputs raise `ValueError` with a message that says what is wrong, where, and expected vs. received (`spec.md` FR7). Never let a cryptic NumPy error reach the student.

## 6. Communication

- Clear, simple English. Explain deep learning ideas briefly and accurately when they appear.
- Be concise: don't repeat the plan in the report, don't paste whole cells the student can read in the notebook.
- If unsure about an API or a requirement, say so instead of guessing.
- If the student asks for something that contradicts the documents, point it out once, then follow their decision and record it in `log.md`.
- When explaining code, explain the code that is actually in the notebook.

## 7. When to stop and ask

- A requirement is ambiguous, or the documents disagree.
- The task needs something not described in the documents.
- `spec.md` or `architecture.md` would have to change.
- A check fails and the fix would change the agreed design.
- A task is much bigger than expected: propose splitting it in `tasks.md`.
- A task is finished (always).
