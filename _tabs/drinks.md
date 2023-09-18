---
layout: page
title: Drinks
permalink: /drinks/
order: 6
icon: fas fa-fw fa-mug-hot
---

This is not a coffee or tea or cocktail blog either, but all the beverage things and components can live here instead.  Syrups, bitters, alcoholic drinks are all mixed in here.

## Drink list

{% assign sorted = site.drinks | sort: 'title' %}
{% for drink in sorted %}
- [{{ drink.title }}]({{ drink.url | relative_url }}) - {{ drink.excerpt }}{% endfor %}
