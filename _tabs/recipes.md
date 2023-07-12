---
layout: page
title: Recipes
permalink: /recipes/
order: 5
icon: fas fa-fw fa-utensils
---

This is not a food blog.  I don't want to be a food blogger.

I would like to make some family recipes publicly accessible without vendor lock-in or asking friends and family to make yet another account on a random "recipe keeper" service.  It’s hard to do better than markdown and a git repo for platform neutrality, so this is as good of a place as any.

## Recipe list

{% assign sorted = site.recipes | sort: 'title' %}
{% for recipe in sorted %}
- [{{ recipe.title }}]({{ recipe.url | relative_url }}) - {{ recipe.excerpt }}
{% endfor %}
