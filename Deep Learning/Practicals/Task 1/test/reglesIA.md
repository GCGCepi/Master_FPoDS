---
om: reglesIA.md
versió: 1.0
descripció: AI assistant usage rules for the CSV visualization practical
---

## Purpose

This document describes how to use the AI assistant in this specific project.
It must guarantee that the work is consistent with the existing files and that the developer keeps responsibility over the code.

It is assumed that **the developer is responsible for every line that enters the repository**. The AI is an assistant, not a decision-maker.

---

## Fundamental principle

Only accept code that you can:

1. Explain.
2. Modify.
3. Debug.
4. Maintain.

If any of these conditions is not met: **STOP.**

---

## Files required in the repository

```
spec.md
architecture.md
tasks.md
reglesIA.md
```

This document applies exclusively to this structure.

---

## Role of each file

- `spec.md`: functional requirements and acceptance criteria.
- `architecture.md`: project structure, components and design decisions.
- `tasks.md`: tasks to be carried out, phase by phase.

---

## Workflow for this project

### Phase 1 — Specification review

Before coding, read `spec.md` and confirm:

- What the functional requirements are.
- What the acceptance criteria are.
- What format the CSV must have.

If any expectations are unclear, ask before continuing.

---

### Phase 2 — Architecture review

Read `architecture.md` and confirm:

- What file structure the project must have.
- What the responsibility of each file is.
- What technologies must be used (HTML/CSS/JS, Chart.js).

If the proposal does not fit the practical, correct the file before implementing.

---

### Phase 3 — Planning

Read `tasks.md` and choose a specific task to implement.
Always implement a single task at a time.

Before generating code, explain:

- What the task does.
- Which files it touches.
- Which functions need to be written.
- How it will be verified.

---

### Phase 4 — Implementation

Generate only the code needed for the selected task.
Do not implement the whole project in one go.

For each change, check that it:

- Fits `spec.md`.
- Respects `architecture.md`.
- Stays simple and readable.

---

### Phase 5 — Immediate review

After implementing a task, review:

- Correctness: does it meet the requirement?
- Validation: does it handle invalid input?
- Readability: is the code clear?

If something is missing, refactor or remove the incorrect code.

---

### Phase 6 — Task closure

After completing and reviewing each task:

1. Mark the task as `[x]` in `tasks.md`.
2. Inform the user of:
   - Which task has been completed.
   - Which files were touched and why.
   - How they can verify that it works.
3. **STOP. Do not continue with the next task until the user confirms explicitly.**

---

## Additional requirements for the AI assistant

- Always read `spec.md`, `architecture.md` and `tasks.md` before generating any code.
- Do not add new files without being explicitly asked.
- Do not change the project structure without authorization.
- Propose changes only when they are justified by the requirement.
- Prioritize clarity and simplicity.
