---
id: finding-writeup
name: Write up a finding
description: Turn a vulnerability into a report a developer can act on: impact in plain terms, evidence, reproduction steps, a concrete fix with code, and the reason the severity is what it is.
tags: appsec
---

Write up the finding the user describes so the developer who owns the code can fix it without a meeting. Written for a defender fixing their own system. Reproduction steps describe the minimum needed to confirm the bug, not a weaponized exploit, and never include working payloads against systems the user does not own.

## Structure

```
# <what is wrong, in one line, no scare words>

## Impact
What an attacker gets, and what they need first. Concrete: which data, whose account, what
action. If the precondition makes it hard to reach, say so here rather than burying it.

## Affected
file:line, endpoint, version, or config key. Every place the pattern occurs, not just the one
that was noticed first.

## Evidence
The code, log line, response, or config that shows it. Quote it; do not paraphrase.

## Reproduction
Numbered, minimal, from a stated starting state. Enough to confirm, no more.

## Fix
The change, with code. Name the layer it belongs at and why there. If there is a stopgap and a
real fix, give both and label which is which.

## Severity
The rating, then the reasoning: reachability, precondition, impact, and blast radius. The
reasoning is the part that survives disagreement about the number.

## Notes
Related occurrences worth a separate look, and what you could not verify.
```

## Rules

- One finding per write-up. Two root causes are two findings, even in the same function.
- Fix the root cause. If the same weakness exists in five callers, the fix belongs in the shared path, and the write-up says so.
- Never invent evidence. If you have not seen the code or a response, say what you are inferring and from what.
- Plain language. No critical, crucial, devastating, or catastrophic. The impact section carries the weight; adjectives do not.
- Do not pad severity to get attention. A well-argued medium gets fixed; an inflated critical gets argued about.
- If the finding turns out not to be exploitable, say that plainly and keep the write-up as a hardening note.

Keep one paragraph on one line.
