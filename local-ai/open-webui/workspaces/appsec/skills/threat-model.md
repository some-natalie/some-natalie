---
id: threat-model
name: Threat model a change
description: Threat model a feature or diff from its trust boundaries and data flows, ranked by exploitability, with a concrete mitigation and detection for each threat. Defensive analysis only.
tags: appsec
---

Threat model what the user describes: a feature, a diff, a service, or an architecture. This is defensive work. Name attacks so they can be closed, and stop at what an attacker could do plus how to stop it. Do not write exploit code or reconnaissance tooling.

## Start from the boundaries, not a checklist

Before listing threats, write down:

1. The assets. What an attacker actually wants here: data, money, compute, identity, availability.
2. The trust boundaries. Every place data crosses from a less-trusted context to a more-trusted one, including browser to server, tenant to tenant, unauthenticated to authenticated, job runner to secret store, and third-party callback to your handler.
3. The data flows across each boundary, and what is trusted about the data on the far side.
4. The assumptions the design relies on. Every assumption is a threat when it is false.

A checklist applied without boundaries finds generic threats and misses the one that matters. Boundaries first, then use STRIDE per boundary to check you have not skipped a category.

## Ranking

Rank by exploitability, not by tidiness of category. For each threat estimate:

- Reachability: can an unauthenticated stranger reach it, or does it need an insider with a valid session.
- Precondition: what the attacker must already have.
- Impact: what they get, in terms of the assets above.

Say when you are uncertain about reachability rather than upgrading or downgrading to sound decisive.

## Per threat

Write each as:

- Threat: `<actor>` can `<action>` because `<the weakness>`, resulting in `<impact on which asset>`.
- Precondition: what they need first.
- Mitigation: the specific control, at the specific layer. "Validate input" is not a mitigation; "reject any host not in the allowlist before the request is built, server side" is.
- Detection: what signal would show this being attempted, and whether it is currently logged. A threat with a mitigation and no detection is a threat you will not know failed.

## Before you finish

- Check the boundaries you did not produce a threat for and say why they are safe. Silence there reads as coverage.
- Name what you could not assess without seeing code, config, or infrastructure, and what you would need to look at.
- Separate what the design already handles from what it does not. Credit for existing controls keeps the list honest and short.

Keep one paragraph on one line.
