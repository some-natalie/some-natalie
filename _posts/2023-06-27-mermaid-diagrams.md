---
title: "Adding Mermaid Diagrams"
date: 2023-06-27
categories:
  - blog
classes: wide
excerpt: "Adding Mermaid (or any custom JavaScript) to a Jekyll site without a plugin"
mermaid: true
---

I just added support for [Mermaid](https://mermaid.js.org/) diagrams to my site and I'm so pleased with how it turned out!  Mermaid is a JavaScript tool for making all sorts of charts and diagrams in code, but having them render beautifully on websites.  I've been using it to make graphics for slides and documentation.  In talking at [BSides Boulder](https://bsidesboulder.org/2023/speakers/) about threat modeling last week, I'd made some nice diagrams to use instead of uploaded static images.

GitHub renders these diagrams natively in Markdown[^1].  Pages is a bit of a different beast, though - it builds my website and then deploys the finished site.[^2]  There's a great Jekyll plugin to do this already called `jekyll-mermaid` but it doesn't support theming.  Since this website is in dark mode, the diagrams were impossible to read.[^3]  Here's a screenshot example that may or may not scale well depending on your browser:

![default-mode](/assets/graphics/2023-06-27-mermaid-diagrams/default-mode.png)

This seemed like a good opportunity to learn some web things while assembling the website version of the slides.

## How

This was simultaneously disappointing and marvelous.  First, add the following header for the YAML front matter in `_includes/head.html`:

{% raw %}
```html
{% if page.mermaid %}
    {% include mermaid.html %}
{% endif %}
```
{% endraw %}

This will tell browsers to load the rather large JavaScript module only where needed, preserving the speed and simplicity of static websites wherever possible.  I'll indicate this need by setting a front matter key on each post that needs Mermaid diagrams using `mermaid: true`, same as other page settings like table of contents, tags, post titles, etc.

Then, import the Mermaid module from the NPM CDN with a new file called `_includes/mermaid.html` with the following contents.  I went with this approach to be able to document configuration settings site-wide in one file, as there may be more than _just_ the theme that I'd like to change moving forward.

```html
<script type="module">
    import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs';
    let config = { 
        startOnLoad: true,
        theme: "dark", 
        flowchart: { 
            useMaxWidth: true, 
            htmlLabels: true 
        } 
    };
    mermaid.initialize(config);
</script>
```

This should be reasonably reusable for other JS libraries too, such as [MathJax](https://www.mathjax.org/).  Define the YAML front matter to toggle loading it in the first file, then import and configure the JavaScript in another.

### :sparkles: :sparkles: Now look this readable diagram! :sparkles: :sparkles:
{: .text-center}

<div class="mermaid">
flowchart LR
    A(fa:fa-laptop-code Developer) --> B(fab:fa-github GitHub\ncode/issues/etc)
    B --> C(fa:fa-server Build)
    C --> D(fa:fa-server Deploy)
    D --> E(fa:fa-user Environment)
</div>

And here's how it was made in the markdown that defines this post.  There's new line characters and [FontAwesome](https://fontawesome.com/search?o%253Dr%2526m%253Dfree) icons too!

```html
<div class="mermaid">
flowchart LR
    A(fa:fa-laptop-code Developer) --> B(fab:fa-github GitHub\ncode/issues/etc)
    B --> C(fa:fa-server Build)
    C --> D(fa:fa-server Deploy)
    D --> E(fa:fa-user Environment)
</div>
```

I'm still working on assembling a much longer post of my slides, talk, and how much fun BSides Boulder was, but for now ...

![genius](/assets/graphics/memes/genius.jpg)

---

### Resources

- [Live editor](https://mermaid-js.github.io/mermaid-live-editor/) to make diagrams and see changes live
- Amazing [cheat sheet](https://jojozhuang.github.io/tutorial/mermaid-cheat-sheet/) for Mermaid syntax
- An older [walkthrough](https://jojozhuang.github.io/tutorial/jekyll-diagram-with-mermaid/) for doing this task
- Mermaid's [theme documentation](https://mermaid.js.org/config/theming.html)

### Footnotes

[^1]: [Include diagrams in markdown](https://github.blog/2022-02-14-include-diagrams-markdown-files-mermaid/)
[^2]: Example build pipeline [here](https://github.com/some-natalie/some-natalie/blob/main/.github/workflows/pages.yml), execution logs [here](https://github.com/some-natalie/some-natalie/actions/workflows/pages.yml)
[^3]: [Accessibility feedback](https://github.com/orgs/community/discussions/13761) issue tracking this
