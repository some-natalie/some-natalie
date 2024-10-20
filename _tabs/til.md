---
title: Today I Learned
permalink: /til/
order: 7
icon: fas fa-book-open-reader
---

🌱 I probably learned something today.  It was likely far too small to write a longer-form post about it.

{% assign posts_by_year = site.til | group_by_exp: 'post', 'post.date | date: "%Y"' | reverse %}
{% for year in posts_by_year %}
## {{ year.name }}
{% assign sorted = year.items | sort: 'date' | reverse %}
{% for post in sorted %}{% unless post.omit == true %}

### {{ post.title }}

{{ post.content }}

({{ post.date | date: "%Y-%m-%d" }}){% endunless %}{% endfor %}

---
{% endfor %}

> These are cross-posted to other platforms as my first foray into [POSSE](https://indieweb.org/POSSE) (Publish on Own Site, Syndicate Elsewhere), so some formatting may get lost between platforms.
{: .prompt-info}
