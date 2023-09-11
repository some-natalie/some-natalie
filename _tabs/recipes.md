---
layout: page
title: Recipes
permalink: /recipes/
order: 5
icon: fas fa-fw fa-utensils
---

This is not a food blog.  I don't want to be a food blogger.

I would like to make some family recipes publicly accessible without vendor lock-in or asking friends and family to make yet another account on a random "recipe keeper" service.  It’s hard to do better than markdown and a git repo for platform neutrality, so this is as good of a place as any.

- [Seasoning blends](../recipes/seasoning-blends)
- [Sous vide time chart](#sous-vide-time-chart)
- [Stand mixer attachments](#stand-mixer-speed-chart)
 

## Recipe list

{% assign sorted = site.recipes | sort: 'title' %}
{% for recipe in sorted %}
- [{{ recipe.title }}]({{ recipe.url | relative_url }}) - {{ recipe.excerpt }}
{% endfor %}

## Sous vide time chart

This is all completely opinionated - just wanted to write down the combination that goes over well.

| Cut | Temp | Time | Notes |
| --- | --- | --- | --- |
| Beef brisket | 155 °F / 68 °C | 30 hours | add 1-2 drops liquid smoke, a pinch of [pink curing salt](https://en.wikipedia.org/wiki/Curing_salt)<br>finish in oven at 300 °F / 149 °C for 1-2 hours for bark |
| Beef prime rib | 132 °F / 55 °C | 6 hours | finish in oven at 425 °F / 218 °C for 10-15 minutes before serving |
| Beef steak (most cuts) | 129 °F / 54 °C | 2-4 hours | sear before serving |
| Beef tri-tip roast | 134 °F / 57 °C | about 2 hours | sear before serving |

## Stand mixer speed chart

KitchenAid mixer speed to attachment chart.  I lost the manuals to these years ago.

### Pasta rolling set	

| attachment | speed |
| --- | --- |
| pasta roller | 2 |
| fettuccine cutter | 5 |
| spaghetti cutter | 7 |

### Pasta extruder

| attachment | speed |
| --- | --- |	
| spaghetti plate | 10 |
| bucatini plate | 10 |
| rigatoni plate | 6 |
| fusilli plate | 2 - 4 |
| large macaroni | 6 |
| small macaroni | 6 |

### Spiralizer

| attachment | speed |
| --- | --- |
| fine blade | 4 |
| medium blade | 6 |
| slicing blade (small core) | 4 |
| slicing blade (large core) | 6 |
| peeling blade | 4 |

### Other attachments	

| attachment | speed |
| --- | --- |
| ice cream machine | STIR |
| food grinder | 4 |
| sausage stuffer | 4 |
| shredder/slicer (all blades) | 4 |
