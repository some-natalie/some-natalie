---
date: 2024-10-23
title: "Escaping brackets in code blocks in Jekyll"
tags:
  - yaml
  - jekyll
  - liquid
visibility: public
---

In Jekyll, anything with`{{ }}` will be interpreted as Liquid first.  This breaks a bunch of templating languages.  The code you want to show won't display as intended in the code block.

Fix this with `{% raw %}` and `{% endraw %}` tags to wrap your code block.  Maybe it's "today i spent several hours relearning" or "today i knew i did this before and couldn't find it, yet couldn't bring myself to just google it" 🤦🏻‍♀️

```plaintext
{% raw %}
```yaml
{{ .Chart.Name }}-{{ .Chart.Version }}  # helm
${{ github.repository }}  # github actions
end with three backticks
escape the backticks below to make it render right
\```
{% endraw %}
```
