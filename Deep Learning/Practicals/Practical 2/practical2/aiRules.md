# Working rules for the AI assistant

## Context

The user designs the solution in the project documents; the AI assistant implements it **one task at a time**, editing the notebook directly. The goal is a notebook the user can **explain line by line**: how the data is simulated, what each model outputs, where the conservation law enters, what is differentiated, and what each result shows. The assistant keeps the user in control and never makes design decisions alone.

## 1. Documents and priority

| File | Contains |
| --- | --- |
| `spec.md` | Requirements (FR), checks, acceptance criteria |
| `architecture.md` | Sections, functions, shapes, design decisions |
| `tasks.md` | Tasks in order, with progress marks |
| `aiRules.md` | How the assistant works (this file) |
| `log.md` | How this version was decided, and every change since |
| `A1_Phase_A_Group_Exercise.ipynb` | The Phase A plan, in this folder (read-only) |

If documents conflict, follow: the user's explicit instruction in the conversation → `aiRules.md` → `spec.md` → `architecture.md` → `tasks.md`. Point out any conflict or gap, propose a fix, and wait.

## 2. Start of every session

1. Read the five `.md` files, the Phase A notebook and the Phase B notebook as it is now.
2. Find the next task in `tasks.md`.
3. Give a short summary (done, next, any problem in the documents) and wait for confirmation.

## 3. Task workflow

1. **Plan** (a few bullets): what the task does, which FR it serves, the cells and functions with their signatures, how it will be checked. Ask if a decision is not covered.
2. **Implement.** Complete the template's cells in place, keeping its class names, signatures and section order. Markdown first, then code. Only what this task needs. Every function gets a short docstring (purpose, inputs with shapes, output); non-obvious lines get a comment saying *why*.
3. **Verify.** Run the notebook and read the **actual** output. Checks are `assert` statements after the values they check are printed (except in section 7, see §5). There are no target numbers: the results are whatever the design produces. Never tune towards a hoped-for result, and never weaken a check to make it pass.
4. **Self-review:** shapes, the axis of every mean, the sign of every term in the balance, raw vs normalized arrays, leakage, simplicity.
5. **Close and stop.** Mark the task `[x]`; log decisions and the headline numbers of training tasks in `log.md`; report:

   ```
   ✅ Task X.Y — <name>
   What was done: <1–3 sentences>
   Verified: <what was run, key numbers>
   Key concepts: <1–3 bullets>
   Open issues: <or "none">
   ```

   Then **wait** for an explicit "ok / next / continue". A question is not a confirmation.

If the notebook cannot be run on the user's machine, run it in the assistant's own workspace and copy the notebook and the documents back to this folder after every task.

## 4. Scope

- Only what the documents describe or the user approves in the conversation.
- Don't modify `spec.md` or `architecture.md` without the user's approval; the only free change to `tasks.md` is ticking tasks.
- Out-of-task bugs or ideas go to "Open issues", not into the code.
- Don't change the Phase A notebook. Delete nothing except the cache in `results/` and temporary verification cells and files.

## 5. Technical rules

### Tools

`jax`, `flax.linen`, `optax`, `numpy`, `matplotlib`, and `time`, `os`, `zlib`. No PyTorch, TensorFlow, Keras or scikit-learn.

### Physics and data

- **`c(t)` never leaks**: not an input, not in a batch, not in a loss, not used to choose anything. Only diagnostics after training use it.
- **Raw units in the balance**: `((m + r) − q) − ĉ + δ` with unnormalized `m, r, q`, in that order, in the model and in the metrics.
- **Split by sequence.** Statistics from the training sequences actually used. The test set is only measured; selection (best epoch, `μ`) uses validation.
- **Identical conditions**: every run shares all settings except the one factor its experiment changes.

### JAX

- Every random call gets its own key by splitting; run keys come from `run_key(name, seed)`. Never reuse a key.
- Pure loss, step and validation functions; no Python `if` on array values inside jitted code; one jitted step per run, built outside the epoch loop.
- Convert losses to Python floats before storing them; results to NumPy before caching.

### Section 7 style

- Complete, readable functions; no divergence stops, trial runs or argument-clash checks.
- **Each value is printed once** in the section: run cells print only "computed" / "loaded"; the best epoch and losses appear in the line under the loss plot; the training time only in section 8's table.
- One conclusion Markdown cell at the end of the section, instead of short comments between cells.
- Tasks 3.1–3.2 are verified with temporary cells that are deleted before closing the task.

### Reporting results

- Option 4's conservation is approximate: never call its physical error guaranteed. A zero for the baseline or for Option 4 is *measured on this set*.
- Don't present `ĉ` alone as the recovered consumption when `δ` is not near zero; use `ĉ − δ` and say why.
- Keep claims the size of the evidence: one seed, one kind of shift.
- Warning signs (a loss that doesn't drop, `NaN`, an implausible value such as an error below the noise in `c`) are reported with a reasoned cause, never hidden.
- Interpretations are written after the numbers exist and cite them.

## 6. Communication

- Clear, simple English; explain deep learning and JAX ideas briefly and accurately when they appear.
- Concise reports; don't paste cells the user can read in the notebook.
- If unsure about an API or a requirement, say so.
- If the user asks for something that contradicts the documents, point it out once, then follow their decision and record it in `log.md`.
- The reflection answers are the user's: provide notes only.

## 7. When to stop and ask

- A requirement is ambiguous or the documents disagree.
- The task needs something the documents don't describe, or a change to `spec.md` / `architecture.md`.
- A check fails and the fix would change the design.
- A result looks implausible and no wiring error explains it.
- A task is much bigger or slower than expected (propose a split).
- Always when a task is finished.
