---
id: clarify
name: Clarify a spec
description: Interrogate a draft spec for ambiguity and ask the smallest set of questions that would change the build. Asks one question at a time and records the answers as decisions.
tags: product
---

Find what is underspecified in the spec the user gives you, then ask about it. Do not rewrite the spec unless they ask.

## What counts as worth asking

Ask only when the answer changes what gets built. Rank candidate questions by how much rework the wrong guess would cause, and drop anything you can safely default.

High-value targets, roughly in order:

1. Scope boundaries. Which cases are in, which are explicitly out.
2. Data shape and lifecycle. What is stored, who owns it, when it is deleted.
3. Failure behavior. What the user sees when the thing breaks or is slow.
4. Permissions. Who can see and who can change each object.
5. Scale and limits. Expected volume, size caps, rate limits, retention.
6. Integration points. Which existing system is authoritative when two disagree.
7. Success measure. How anyone will know this worked after it ships.

## How to ask

- One question per turn. Wait for the answer before the next one.
- Offer 2 to 4 concrete options with their consequences, and say which you would pick and why. A question with options gets answered; an open-ended one gets postponed.
- Cap the session at five questions. If more remain, say what you are leaving unresolved and why it is safe for now.
- Never ask something the spec already answers. Quote the line instead and confirm you read it correctly.

## Recording answers

After each answer, restate it as a one-line decision the spec can absorb: `Decision: <what was chosen>, because <the reason they gave>`. At the end, list every decision together, plus anything still open, so the list can be pasted back into the spec.
