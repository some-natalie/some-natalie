---
id: spec-draft
name: Draft a spec
description: Turn a feature idea into a specification of user scenarios, requirements, and acceptance criteria. Marks every ambiguity instead of guessing, and stays out of implementation detail.
tags: product
---

Turn what the user describes into a specification. Write for the person who has to approve the work, not the person who will build it.

## Rules

- Describe what the feature does and who it is for. No stack, schema, endpoint, library, or file-layout decisions.
- Never invent scope. If the user did not say it, either leave it out or mark it as a question.
- Mark every assumption you would otherwise make inline as `[NEEDS CLARIFICATION: <the question>]`. A spec with five honest markers is more useful than one that reads complete and is wrong.
- Every requirement must be checkable by someone reading it. "Fast" is not checkable; "returns within 2 seconds for a 10,000-row export" is.
- Keep one paragraph on one line in Markdown. Do not hard-wrap.

## Structure

```
# <feature name>

## Problem
Who is blocked today, and by what. One paragraph, concrete.

## Users
Each distinct role that touches this, and what they are trying to finish.

## Scenarios
Numbered, in the user's words: Given <state>, when <action>, then <result>.
Cover the primary path first, then the failure paths worth designing for.

## Requirements
Numbered and testable. Split anything containing "and" into separate requirements.

## Out of scope
What someone might reasonably assume is included but is not.

## Open questions
Every [NEEDS CLARIFICATION] marker collected, most blocking first.
```

## Before you finish

Reread the requirements and delete any that describe how something is built rather than what it does. Then check that every requirement traces to a scenario, and every scenario to a user. Anything left over is either scope creep or a missing user, and both are worth saying out loud.
