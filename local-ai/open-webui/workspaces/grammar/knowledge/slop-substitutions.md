# slop substitutions

Lookup tables for the style pass. Each entry is a word or construction that shows up far more often in generated text than in writing someone actually said out loud, paired with what to use instead. Substitutions are suggestions, not mechanical replacements: pick the one that fits the sentence, or restructure.

## punctuation

Delete every em dash (—). Replace it with a comma for a parenthetical, a colon to introduce an explanation or list, parentheses for a genuine aside, a semicolon to join two related clauses, or a period and a new sentence. There is no em dash key on a standard keyboard, which is most of why its presence reads as machine output.

| instead of | use |
|---|---|
| The results—which surprised us—showed... | The results, which surprised us, showed... |
| This approach—unlike the old one—allows... | This approach, unlike the old one, allows... |
| Both skills—written and verbal—matter | Both skills (written and verbal) matter |

Rhetorical colons are a related tic: "Here's the thing:", "The bottom line:", "Think about it:", "The reality:". Cut the frame and state the thing.

## verbs

| avoid | use |
|---|---|
| delve into | explore, examine, investigate, look at |
| leverage | use, apply, draw on |
| utilize | use |
| facilitate | help, enable, support |
| foster | encourage, support, develop |
| bolster | strengthen, support, reinforce |
| underscore | emphasize, highlight, stress |
| unveil | reveal, show, introduce |
| navigate (figurative) | manage, handle, work through |
| streamline | simplify |
| enhance | improve, strengthen |
| ascertain | find out, determine |
| elucidate | explain, clarify |
| endeavor | try, attempt |
| shed light on | clarify, explain, reveal |
| pave the way for | enable, allow, make possible |

## adjectives

Most of these stand in for a specific fact. The fix is usually the fact, not a synonym.

| avoid | use |
|---|---|
| robust | strong, reliable, thorough |
| comprehensive | complete, thorough, full |
| pivotal | key, central |
| crucial, vital, essential | important, necessary |
| significant | name the size |
| transformative | major |
| cutting-edge, groundbreaking, innovative | new, recent, original |
| seamless | smooth, easy |
| intricate, nuanced, multifaceted | complex, detailed, subtle |
| holistic | complete, whole |
| elegant | simple, direct |

## nouns used metaphorically

Cut these when they are doing metaphorical work. Literal uses are fine.

| flag (metaphorical) | fine (literal) |
|---|---|
| a tapestry of regulations | a medieval tapestry |
| a symphony of features | Beethoven's symphony |
| a beacon of hope | a lighthouse beacon |
| in the realm of security | a realm as a territory |
| a testament to innovation | last will and testament |
| the regulatory landscape | the Arizona landscape |
| the repair ecosystem | Apple's software ecosystem |

## transitions and openers

| avoid | use |
|---|---|
| furthermore, moreover | also, and, in addition |
| that being said, with that in mind | however, but, still |
| at its core, in essence | essentially, or cut it |
| it is worth noting that, it should be noted that | note that, or cut it |
| in the realm of, in the landscape of | in, within |
| in today's [anything], in an era of | now, today, currently |
| in conclusion, to sum up, at the end of the day | cut it, or state the conclusion |
| prior to / subsequent to | before / after |
| in light of | because of, given |
| with respect to, in terms of, pertaining to | about, regarding, for |
| a myriad of, a plethora of | many, several |
| the fact that | that, or rewrite |

## intensifiers and filler

Cut these unless the word carries real meaning in context. If the author had a number, keep the number; if not, cutting the intensifier loses nothing: absolutely, actually, basically, certainly, clearly, definitely, dramatically, essentially, extremely, fundamentally, incredibly, interestingly, naturally, obviously, quite, really, remarkably, significantly, simply, surely, truly, ultimately, undoubtedly, very.

## hedging

Generated text hedges much more than a person writing about something they know. Unhedge constructions that avoid committing: "may potentially", "can help to", "might be able to", "one could argue that", "it is widely acknowledged that". State whether the thing happens.

More than about three hedges in one paragraph is worth a second look. Sections that state settled facts (background, history, a timeline) should barely hedge at all. Sections about pending decisions, open litigation, or genuinely disputed questions should hedge, and flagging them is a false positive.

Real hedging is grounded in something specific: "the 2024 enforcement data suggests a rise" hedges on evidence. Blanket hedging on an established fact does not.

## sentence and paragraph shapes

Some tics are structural rather than lexical.

- **Contrasting parallelism.** "It's not X, it's Y." "The issue isn't X. The issue is Y." Sounds profound, commits to nothing. More than two in a stretch of a few hundred words is a strong signal. Say what the thing is.
- **"Whether you're a X, Y, or Z"** and other lists built in threes because three sounds complete.
- **"By [gerund], you can [outcome]"** as a sentence opener.
- **Uniform paragraph length.** Paragraphs all landing within a few words of each other, usually three or four sentences apiece, indicates generated symmetry. Vary length with the complexity of what the paragraph covers. Lists and tables are uniform by design and are not evidence of anything.
- **Uniform sentence length.** A long block with nothing under eight words and nothing over thirty lacks the variation real writing has.
- **Transition density.** If most paragraphs open with a transition word or adverbial clause, the connective tissue is artificial. Cut most of them; the order of the paragraphs should carry the argument.
- **Repeated openers.** Three or more consecutive paragraphs starting with the same word or pattern.
- **Flat register.** Introduction, body, and conclusion written at identical pacing and complexity. People tighten up in an introduction and shift register in a conclusion.
- **Excessive bold.** Concepts, product names, and inline pseudo-headers set in bold throughout.

## markup artifacts

These strings are citation placeholders from various assistants and mean text was pasted in without editing. Zero tolerance, always remove: `oaicite`, `contentReference`, `turn0search0`, `grok_card`, `attributableIndex`.

## when not to flag

Do not apply any table above inside a direct quote, a title or value taken verbatim from a source, or a code, configuration, or markup example being shown as an example.

Severity drops when a flagged word sits next to specifics. "a comprehensive examination of the issues" is abstract and worth flagging; "comprehensive audit by the FTC in 2024" names an entity and a date and is probably being used with technical meaning.

The words on these lists are not forbidden. They are overused. A sentence that needs "essential" and means it keeps it.
