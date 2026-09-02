# house style

Conventions for prose in this repo, blog posts, pull requests, issues, and commit messages. The copy-edit skill enforces these; this file is the long-form reference for the cases the skill's summary does not spell out.

## markdown formatting

One paragraph is one line. Never hard-wrap prose to a column width, and let the renderer and editor soft-wrap instead. Line breaks belong only where Markdown needs them: between blocks, and inside list items, tables, and code blocks. This applies to every `.md` file, PR body, issue body, and commit body.

Do not put `---` between sections when headings already separate them. A horizontal rule is for a real break in the document, not decoration between every heading.

Code lines wrap at 100 characters. Prose never does.

## headings

Headings are lowercase and descriptive. `# pihole stuff`, `# updating my profile readme automatically using github actions`, `# there i fips'd it`. Not `# Pihole Stuff`, not title case, not sentence case with a capital unless the first word is a proper noun.

A heading names what the section holds. It does not tease it. If a heading would work as a thriller chapter title or a video thumbnail, rewrite it. `## the initialization trap` is wrong; `## importing vs initializing, and how metadata gets destroyed` is right.

Keep the repo's existing capitalization when editing an existing file, even where it disagrees with this rule. Consistency inside one document beats consistency across the corpus.

## commits

Imperative mood, subject line 72 characters or fewer, one logical change per commit. "Scope PR-creation permissions out of pull_request runs", not "Scoped..." or "This commit scopes...". The body follows the one-paragraph-one-line rule.

## pull requests and issues

Describe what the code does now. Not the approaches that were tried and discarded, not prior iterations, not alternatives that were considered. Only what is in the diff.

Use plain, factual language. A bug fix is a bug fix, not a "critical stability improvement" and not a "significant reliability enhancement." The following words are banned in PR and issue text specifically, because they inflate routine work: critical, crucial, essential, significant, comprehensive, robust, elegant.

Name the actual change and its actual effect. "Drops the retry loop; the underlying timeout was the bug" beats "Improves error handling robustness."

## claims and evidence

End a claim on a concrete detail. A sentence that asserts something matters without naming a fact is a sentence to flag, but never invent the fact to fix it. Ask the author instead.

Prefer general framing over a brittle statistic. A specific number that cannot be verified, or that will be stale in six months, is worse than an accurate qualitative statement. If a number is load-bearing, it needs a source; if it is decoration, cut it.

## voice

Contractions are fine. Sentence fragments used for rhythm are fine. Dialect is the author's business. First person is fine.

Vary sentence length. A run of sentences that all land between fifteen and twenty words reads mechanically even when every one of them is correct. Short sentences carry emphasis. Longer ones carry the reasoning that earns it.

Do not smooth out a plain, correct sentence. The goal is to remove tics, not to raise the register.

## what never changes in an edit

- Facts, numbers, dates, names, citations, and quotes. Never add them, never remove them, never soften a claim the author supports.
- Markdown structure, code blocks, link targets, and inline formatting, unless the edit is inside prose.
- Spelling convention already established in the text. Match it rather than imposing American or British spelling.
- Oxford comma habits. Follow the author.
- Anything inside a direct quote, a title taken verbatim from a source, or a code or configuration example. These are exclusion zones for every rule above.
