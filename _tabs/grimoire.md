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

- [crontab.guru](https://crontab.guru/) is `cron` scheduling for humans
- [CyberChef](https://gchq.github.io/CyberChef/), the magic multi-tool for data decoding and deobfuscation
- [Draw.io](https://app.diagrams.net/) makes flowcharts and diagrams, exportable as images or XML
- [JSONcrack](https://jsoncrack.com/editor) makes JSON human friendly
- [Markdown table generator](https://www.tablesgenerator.com/markdown_tables)
- [Mermaid JS diagram live editor](https://mermaid-js.github.io/mermaid-live-editor)
- [sed.js](https://sed.js.org/) for testing `sed` commands online
- [Tree generator](https://tree.nathanfriend.io/) for creating file tree diagrams

---

🧙🏻‍♀️ A grimoire is a book of magic spells and invocations.  Many of the folks I started working with kept and shared collections of their useful regex/shell/perl code, which I am still tremendously grateful for.  Instead of my own little stash spreading across a bunch of different places without context, such as my [dotfiles repo](https://github.com/some-natalie/dotfiles) and [gists](https://gist.github.com/some-natalie) and other untracked files, I'm collecting those little bits here to share.
