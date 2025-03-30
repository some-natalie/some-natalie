# updating my profile readme automatically using github actions

[Lazy profile readme updates from my blog](https://some-natalie.dev/blog/automagic-profile-updates/) started it, then [Push commits to another repository with GitHub Actions](https://some-natalie.dev/blog/) fixed it once these became two separate repos (private website files repo + public profile repo).

Files

- [latest-posts.py](latest-posts.py) is the Python script I place at `~/.github/scripts/latest-posts.py` to update my profile README file in a public repository using content the posts in the private repo that has my website's files.
- [update-readme.yml](update-readme.yml) is the GitHub Actions workflow that runs ^^ and is placed at `~/.github/workflows/update-readme.yml`, please note it needs a PAT that can write to the public repo.
