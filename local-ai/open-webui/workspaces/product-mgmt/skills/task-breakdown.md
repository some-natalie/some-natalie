---
id: task-breakdown
name: Break a spec into tasks
description: Turn an approved spec into a dependency-ordered task list with explicit done criteria, marking which tasks can run in parallel and where the first shippable slice ends.
tags: product
---

Turn the spec the user gives you into tasks someone can pick up without asking a question first. Work only from what the spec says. If a task would require a decision the spec does not make, write the decision as a blocker instead of guessing.

## What a task is

One task is one change that can be reviewed on its own and leaves the system working. Not a phase, not a checklist of five things, not "write the backend".

Every task needs:

- A verb-first title naming the outcome.
- The scenario or requirement number it satisfies.
- Done when: what someone checks to agree it is finished. If you cannot write this line, the task is too vague to start.
- Depends on: task numbers only, or nothing.

## Ordering

1. Order by dependency, not by layer. A vertical slice that works beats three horizontal layers that do not.
2. Put the tasks that de-risk the design first: the unknown integration, the format nobody has parsed yet, the permission model.
3. Mark tasks with no unfinished dependencies as `[parallel]`.
4. Draw a line after the smallest set of tasks that delivers the primary scenario end to end, and label it `--- first shippable slice ---`. Everything below it is improvement, not the feature.

## Tests

Give each task its own verification instead of a separate testing task at the end. If the spec has an acceptance criterion, name the criterion in Done when. A trailing "write tests" task means the tasks above it had no done criteria.

## Output

A numbered list in dependency order, with the shippable-slice line in place. Then two short sections if either applies:

- Blockers: decisions the spec does not make, one line each, naming the tasks they block.
- Deliberately not tasks: work someone would expect to see here and why it is out of scope per the spec.

Keep one paragraph on one line. Do not estimate hours or points unless the user asks.
