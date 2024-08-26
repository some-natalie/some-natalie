---
title: "Grimoire"
icon: fa-solid fa-hat-wizard
order: 6
---

An always-changing collection of notes, links, tables, and other such goodies! 💝

## Note pages

{% assign sorted = site.resources | sort: 'title' %}
{% for page in sorted %}{% unless page.omit == true %}- [{{ page.title }}]({{ page.url | relative_url }}) - {{ page.excerpt }}
{% endunless %}{% endfor %}

## Tools

- [awk.js](https://awk.js.org) for testing `awk` commands online
- [crontab.guru](https://crontab.guru/) is `cron` scheduling for humans
- [CyberChef](https://gchq.github.io/CyberChef/), the magic multi-tool for data decoding and deobfuscation
- [Draw.io](https://app.diagrams.net/) makes flowcharts and diagrams, exportable as images or XML
- [jq play](https://jqplay.org/) for testing `jq` commands online
- [JSONcrack](https://jsoncrack.com/editor) makes JSON human friendly
- [Markdown table generator](https://www.tablesgenerator.com/markdown_tables)
- [Mermaid JS diagram live editor](https://mermaid-js.github.io/mermaid-live-editor)
- [Party-ify emoji generator](https://nathanielw.github.io/party-ify/) because sometimes you need a party
- [sed.js](https://sed.js.org/) for testing `sed` commands online
- [Tree generator](https://tree.nathanfriend.io/) for creating file tree diagrams
- [1-on-1 questions](https://veryhappythings.github.io/101-questions/) - a random selection of questions from [101 questions](https://jasonevanish.com/2014/05/29/101-questions-to-ask-in-1-on-1s/) to get unstuck

---

🧙🏻‍♀️ A grimoire is a book of magic spells and invocations.  Many of the folks I started working with kept and shared collections of their useful regex/shell/perl code, which I am still tremendously grateful for.  Instead of my own little stash spreading across a bunch of different places without context, such as my [dotfiles repo](https://github.com/some-natalie/dotfiles) and [gists](https://gist.github.com/some-natalie) and other untracked files, I'm collecting those little bits here to share.
