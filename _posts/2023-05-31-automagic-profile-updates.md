---
title: "Lazy profile readme updates from my blog"
date: 2023-05-31
tags:
  - CI
excerpt: "There’s a thousand profile README generators, so of course I had to roll my own instead."
---

I’ve been on a professional "refresh all the things" theme the past few months - updated the [résumé](https://github.com/some-natalie/some-natalie/blob/main/RESUME.md), [LinkedIn](https://www.linkedin.com/in/nsomersall/), etc.  Not because I'm looking to change anything professionally at the moment, but with tons of industry layoffs and an atmosphere of general malaise, I'd rather just ~~embrace the suck~~ be prepared for bad news.  So once I realized that my [GitHub profile](https://github.com/some-natalie) gets about as many hits as my LinkedIn profile or blog per month, tying the 3 together sounds like a good idea.[^1]

Adding social links to each other is easy from my blog’s theme ([link](https://mmistakes.github.io/minimal-mistakes/docs/configuration/#site-author)), LinkedIn (kinda the whole reason it exists), and GitHub ([link](https://docs.github.com/en/account-and-profile/setting-up-and-managing-your-github-profile/customizing-your-profile/personalizing-your-profile#adding-links-to-your-social-accounts)).  But what I _really_ wanted to do was to show that I update stuff somewhat routinely - automatically update my profile from my blog content.

![it-works](/assets/graphics/2023-05-31-automagic-profile-updates/it-works.png)

At a high level, all that was needed is a simple Python script and a GitHub Action to run it as needed - editing a section in the `README.md` file and committing/pushing it back to the same repository.

## Updating my profile README

The script in `~/.github/scripts/latest-posts.py` ([link](https://github.com/some-natalie/some-natalie/blob/main/.github/scripts/latest-posts.py)) is what makes everything happen.  It gets the latest information from all the posts and updates the README file between two comments.  There's a really nifty package called [`frontmatter`](https://pypi.org/project/python-frontmatter/) that reads and parses YAML front matter used in the posts.

There's three functions that list the contents of the `~/_posts` directory, reads the metadata from the YAML in each file, then constructs the URL from the filename and custom domain.  Then it'll change the content between the `START` and `END` tags within the markdown file, leaving a link to the website (not the markdown file of the post) and the blurb of what the post is about for the latest three posts.

## Now run the thing when needed

The GitHub Actions workflow in `~/.github/workflows/update-readme.yml` ([link](https://github.com/some-natalie/some-natalie/blob/main/.github/workflows/update-readme.yml)) runs whenever a push to `main` changes any of the posts to commit and push back into the repository, making the new posts visible on my profile readme. 🎉

Since the script is only looking at filenames, this step will fail with no changes to commit/push if a file is edited but not created.  A small Bash `if` condition helps out here, exiting with a status code of `0` if there’s only edits to existing files.  This tells Actions that it succeeded with no changes when that happens.

{% raw %}

```shell
if [[ `git status --porcelain --untracked-files=no` ]]; then
  # Changes
  git add README.md
  git commit -m "${{ env.CI_COMMIT_MESSAGE }}"
  git push
else
  # No changes
  echo "no changes to latest posts"
  exit 0
fi
```

{% endraw %}

## Roll your own

There’s a million profile readme generators that do way more intricate stuff.  Some take credentials to log in and scrape data to calculate neat statistics like your top languages, pull request / review activity, etc. for private repositories too.  Others generate beautiful _live!!!_ visualizations of that data.  They’re gorgeous and complicated and perhaps a bit slow, since you’re generating that information on demand - overkill for editing a simple text file when something changes, which is all I wanted to accomplish.

Rolling my own script here scratched the itch to Build A Thing - even if it’s a tiny and inconsequential thing.  It’s simple, extremely fast on page loads, and doesn’t need much fiddling or ongoing maintenance.

A quick change of the site's domain in the Python script should be all you'd need to reuse this on any other Jekyll + GitHub Pages site. 💖

---

## Footnotes

[^1]: The way to find this out isn’t terrifically obvious, but since your profile repository has to be public for the README file to show up, you can use the built-in traffic insights for that repo at `https://github.com/<username>/<username>/graphs/traffic`.
