# Fix: exercises duplicated / not removed when editing an active program

## Problem

Editing an active program (drag an exercise to another day, or hide one) produces:
- The dragged exercise is **duplicated** instead of moved (stays in the source day and is copied into the destination).
- Hiding/deleting an exercise **does nothing** — it stays in the workout.

### Root cause

`updateUserProgram` in `src/utils/programCustomizer.ts` propagates edits to every non-completed week of each day, but it matches existing DB rows to the edited kanban exercises by the **database row `id`** (`ex.id === exercise.id`).

That row `id` belongs only to the single "vigente" week that the editor loaded. For all other weeks the ids never match, so:
- moved-in exercises are always re-inserted (→ duplicates, including stacking on a day that already had that exercise),
- moved-out / hidden exercises are not recognized for deletion (→ leftovers),
- the `&& !ex.concluido` guard further blocks removals.

Confirmed in the database: week 2 of day 1 of the active program now holds `Rosca Direta` plus **two** `Rosca Scott Máquina` rows.

The fix is to reconcile by a **stable identity** that is identical across all weeks: `card_original_id` (which the data confirms is shared by every weekly copy of the same logical exercise), with a fallback chain consistent with the project's existing three-tier convention.

## Changes

All changes are in `src/utils/programCustomizer.ts`, function `updateUserProgram` (both the advanced and beginner branches). No schema, RLS, or UI changes.

### 1. Stable matching key

Introduce a helper that derives a stable key for both a kanban `Exercise` and a DB row:

```text
key(exercise) = cardOriginalId  ||  originalId/exercicio_original_id  ||  ("name::" + nome + "::" + grupo_muscular)
```

Use `card_original_id` first (stable across weeks), then `exercicio_original_id`, then a name+group fallback for legacy rows that have neither.

### 2. Assign stable ids to brand-new exercises

For exercises added in the editor (`id` starting with `"exercise-"`, no `cardOriginalId`), generate **one** `card_original_id` (uuid) per desired exercise at the start of the save and reuse it for the inserts into every week. This guarantees future saves can match them and prevents re-duplication on the next edit.

### 3. Deterministic per-treino reconcile

Replace the current id-based update/insert/delete blocks (advanced branch ~lines 395-454, beginner branch ~lines 455-508) with, for each **non-completed** treino of the day:

1. Load current rows for that treino.
2. Keep all `concluido` rows untouched (they are history; never deleted or duplicated).
3. Build the desired list = visible (non-hidden) exercises in order, each with its stable key.
4. Match desired ↔ existing **non-completed** rows by stable key:
   - **matched** → UPDATE fields (`nome`, `grupo_muscular`, `series`, `repeticoes`, `ordem`, and for advanced `metodo_especial`, `rer`, `modelo_feedback`) and set the new `ordem`.
   - **desired, unmatched** → INSERT (carrying the stable `card_original_id`).
   - **existing non-completed, unmatched** → DELETE.

Because the key is stable across weeks:
- A move = key absent in source's desired list (→ delete) and present in destination (→ insert): a true move, no duplicate.
- A hide = key removed from desired list (→ delete in every non-completed week).
- Existing duplicate rows that share a key collapse to a single matched row (the extras become unmatched → deleted), so **the corruption self-heals on the next save**.

Apply the identical reconcile structure to both the advanced (`exercicios_treino_usuario_avancado`) and beginner (`exercicios_treino_usuario`) branches.

## Out of scope / notes

- The drag-and-drop warning dialog wiring (`onMoveExerciseBetweenDays`) is unrelated to the data bug and is left as-is.
- Self-healing fixes future edits. The already-corrupted rows in the current active program will be cleaned automatically the next time that program is saved through the editor. If you'd prefer, I can additionally run a one-off cleanup (a migration/delete) to remove the existing duplicate rows immediately — tell me and I'll include it.

## Verification

- Re-save the active program in the editor; query `exercicios_treino_usuario_avancado` for the program and confirm each non-completed week/day has exactly one row per exercise and no leftovers.
- Test in preview: swap two exercises across days → each appears only in its new day across all upcoming weeks. Hide an exercise → it disappears from all upcoming workouts. Completed weeks remain unchanged.
