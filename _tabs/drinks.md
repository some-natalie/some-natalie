---
layout: page
title: Drinks
permalink: /drinks/
order: 6
icon: fas fa-fw fa-mug-hot
---

This is not a coffee or tea or cocktail blog.  Syrups, bitters, alcoholic drinks are all mixed in here too.

## Drink list

{% assign sorted = site.drinks | sort: 'title' %}
{% for drink in sorted %}
- [{{ drink.title }}]({{ drink.url | relative_url }}) - {{ drink.excerpt }}{% endfor %}
