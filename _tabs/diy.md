---
title: "DIY"
order: 5
icon: fa-solid fa-screwdriver-wrench
---

This isn't a DIY blog.  Sometimes I make things that have nothing to do with computers or technology.  It may be helpful to others to share.  Enjoy!

## Projects

{% assign sorted = site.diy | sort: 'title' %}
{% for diy in sorted %}{% unless diy.omit == true %}- [{{ diy.title }}]({{ diy.url | relative_url }}) - {{ diy.excerpt }}
{% endunless %}{% endfor %}
