---
layout: page
title: Recipes
permalink: /recipes/
order: 5
icon: fas fa-fw fa-utensils
---

This is not a food blog.  I don't want to be a food blogger. 👩🏻‍🍳

I would like to make some family recipes publicly accessible without vendor lock-in or asking friends and family to make yet another account on a random "recipe keeper" service.  It’s hard to do better than markdown and a git repo for platform neutrality, so this is as good of a place as any.

- [Marinades](../recipes/marinades)
- [Seasoning blends](../recipes/seasoning-blends)
- [Stocks and broths](../recipes/stocks)
- [Drinks](#drink-list) 🍹
- [Salad dressings](#salad-dressings)
- [Baking time chart](#baking-time-chart)
- [Sous vide time chart](#sous-vide-time-chart)
- [Stand mixer attachments](#stand-mixer-speed-chart)

---

## Recipe list

{% assign sorted = site.recipes | sort: 'title' %}
{% for recipe in sorted %}{% unless recipe.omit == true %}- [{{ recipe.title }}]({{ recipe.url | relative_url }}) - {{ recipe.excerpt }}
{% endunless %}{% endfor %}

## Drink list

{% assign sorted = site.drinks | sort: 'title' %}
{% for drink in sorted %}{% unless drink.omit == true %}- [{{ drink.title }}]({{ drink.url | relative_url }}) - {{ drink.excerpt }}
{% endunless %}{% endfor %}

## Salad dressings

| Name | Ratios |
| --- | --- |
| Jam | - 2 tbsp jam<br>- 0.25 cup acid<br>- 0.5 cup fat<br>- herbs, to taste |
| Buttermilk | - 0.5 cup buttermilk<br>- 0.25 cup acid<br>- 2 tsp honey<br>- 0.25 cup fresh herbs<br>- salt, pepper, dried herbs to taste |
| Maple | - 0.25 cup maple syrup<br>- 3 tbsp apple cider vinegar<br>- 2 tbsp olive oil<br>- 2 tsp poppy seeds<br>- 2 shallots, minced<br>- 2 tsp Dijon |

## Salad ratios

| Name | Ratios |
| Brussels sprouts | - 10 sprouts, shaved<br>- 1 small apple, finely diced<br>- 0.25 cup seeds or nuts<br>- 0.25 cup dried fruits<br>- 0.25 cup crumbly cheese (optional) |

## Baking time chart

Time and temp combinations that work well.

| What | Temp | Time | Notes |
| --- | --- | --- | --- |
| Bacon | 400°F | 30 mins | fridge, warm on skillet |
| Brussels sprouts | 500°F | 20 mins | start on skillet, flip all halves down |
| Pork ribs | 550°F<br>325°F | 20 mins<br>2 hrs | start uncovered in sheet tray<br>cover tightly in foil to finish |
| Smashed potatoes | 450°F | 30 mins | boil first, use thin tray in oven |
| Any crock pot "low" meal | 225°F | same as recipe | crack lid for evaporation, stir sometimes |

> 🍳 To apply seasoning to cast iron:  Put a baking sheet on the lowest rack, then preheat oven to 500°F.  Apply a thin layer of vegetable oil, removing excess.  Bake for an hour, then cool before storage.  Repeat as necessary.
{: .prompt-tip}

## Sous vide time chart

This is all completely opinionated - just wanted to write down the combination that goes over well.

| Cut | Temp | Time | Notes |
| --- | --- | --- | --- |
| Bacon | 145°F / 63°C | 24 ± 12 hours | finish on skillet |
| Beef brisket | 155°F / 68°C | 30 hours | add 1-2 drops liquid smoke, a pinch of [pink curing salt](https://en.wikipedia.org/wiki/Curing_salt)<br>finish in oven at 300 °F / 149 °C for 1-2 hours for bark |
| Beef prime rib | 132°F / 55°C | 6 hours | finish in oven at 425 °F / 218 °C for 10-15 minutes before serving |
| Beef steak (most cuts) | 129°F / 54°C | 2-4 hours | sear before serving |
| Beef tri-tip roast | 134°F / 57°C | 2 ± 2 hours | sear before serving |
| Burgers | 124°F / 51°C | 1.5-2 hours | finish on pan or grill |
| Dulce de Leche | 185°F / 85°C | 12 hours | 1 can sweetened condensed milk, that's it! |
| Egg bites | 172°F / 78°C | 1 hour | - 6 eggs<br>- 0.25 cup cream cheese<br>- 0.5 cup cheese<br>- other mix ins |
| Poached pears or apples | 176°F / 80°C | 1 hour | - 2 cups white wine<br>- 2 cups water<br>- 1 cup maple syrup<br>- 4 pears or apples |
| Pork shoulder | 185°F / 85°C | 12 ± 4 hours | shred, broil for 5-10 minutes at end |
| Salmon | 120°F / 49°C | 45 ± 15 minutes<br>based on thickness | add fat and some aromatics to bag |
| Toasted cream | 180°F / 82°C | 24 hours | add pinch of baking soda per pint for browning |

## Stand mixer speed chart

Recommended stand mixer speed for each attachment.  I lost the manuals to these years ago.

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
