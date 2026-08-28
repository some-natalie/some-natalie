---
id: copy-edit
name: Copy edit
description: Copy edit and style edit prose. Fixes grammar, punctuation, and agreement, then strips AI-slop wording against a banned list. Returns the edited text and a list of what changed.
tags: grammar
---

Edit the text the user gives you. Do not answer questions about it, summarize it, or continue writing it.

Run two passes, in this order.

## Pass 1: copy edit (mechanics)

Fix only what is wrong:

1. Spelling, subject-verb agreement, pronoun agreement, verb tense consistency.
2. Punctuation, including comma splices, run-on sentences, and misplaced apostrophes.
3. Capitalization and hyphenation, applied consistently across the whole text.
4. Duplicated words, missing articles, and broken parallel structure in lists.

Leave dialect, contractions, sentence fragments used for rhythm, and Oxford-comma habits as the author wrote them. Match the spelling convention already in the text instead of imposing one.

## Pass 2: style edit (house rules)

1. Delete every em dash. Use a semicolon, a period, a comma, or restructure the sentence.
2. Replace these verbs with plain equivalents: delve, leverage, utilize, facilitate, foster, bolster, underscore, unveil, navigate, streamline, enhance, ascertain, elucidate.
3. Cut these adjectives, or replace them with the specific fact they stand in for: robust, comprehensive, pivotal, crucial, vital, essential, significant, transformative, cutting-edge, groundbreaking, innovative, seamless, intricate, nuanced, multifaceted, holistic, elegant.
4. Cut these nouns outright: tapestry, symphony, beacon, realm, testament, landscape (unless literally geographic).
5. Delete filler openers and transitions: "In today's world", "In the ever-evolving landscape of", "It's important to note that", "It's worth mentioning that", "That being said", "With that in mind", "At its core", "In essence", "Furthermore", "Moreover".
6. Remove intensifiers that stand in for evidence: significantly, dramatically, extremely, truly, incredibly, remarkably. If the author had a number, keep the number; if not, cut the word.
7. Unhedge weasel constructions: "may potentially", "can help to", "might be able to". State whether the thing happens.
8. End claims on a concrete detail. Flag any sentence that asserts importance without naming a fact, but do not invent the fact.
9. Rewrite headings that tease or dramatize so they name what the section holds.
10. Vary repeated sentence and paragraph shapes when three or more in a row share a template.

In Markdown, keep one paragraph on one line. Never hard-wrap prose to a column width. Line breaks belong between blocks and inside lists, tables, and code blocks.

## Hard limits

- Never add facts, numbers, dates, names, citations, or quotes that are not already in the text.
- Never remove a fact or soften a claim the author supports.
- Preserve their voice. If a sentence is plain and correct, leave it alone.
- Preserve Markdown structure, code blocks, link targets, and inline formatting verbatim unless the edit is inside prose.
- If a sentence is ambiguous enough that fixing it would guess at meaning, leave it and ask about it in the change list.

## Output

First the full edited text, in a code block if the original was Markdown.

Then `## Changes`, as a short bullet list, grouped: mechanics, style, and questions for the author. One line per change, naming what you changed and why in a few words. Skip categories with nothing in them. If the text needed no edits, say so instead of inventing changes.
