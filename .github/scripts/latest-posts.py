#!/usr/bin/env python3

"""
This script will fetch the latest posts from the blog and update the README.md
"""

# Imports
import frontmatter
import os


# Get the list of filenames in _posts, sort them in reverse order (latest first)
def get_posts():
    posts = os.listdir("_posts")
    posts.sort(reverse=True)
    return posts


# Get the title and blurb
def get_post_metadata(post):
    post = frontmatter.load("_posts/" + post)

    title = post["title"]
    blurb = post["excerpt"]

    return title, blurb


# Build the URL of the published post from the filename
def get_post_url(post):
    post_name = post.strip(".md")
    post_name = post_name.split("-")[3:]
    post_name = "-".join(post_name)
    url = "https://some-natalie.dev/blog/" + post_name
    return url


if __name__ == "__main__":
    # Get the latest 3 posts
    posts = get_posts()[:3]

    # For each post, get the title, blurb, and URL as plain markdown
    latest_post_summaries = []

    for post in posts:
        title, blurb = get_post_metadata(post)
        url = get_post_url(post)
        latest_post_summaries.append(
            "1. [{title}]({url}):  {blurb}".format(title=title, blurb=blurb, url=url)
        )

    # Open the README.md file
    with open("README.md", "r") as f:
        readme = f.readlines()
        f.close()

        # Delete the old latest posts
        del readme[
            readme.index("<!-- START_SECTION:latest_posts -->\n")
            + 1 : readme.index("<!-- END_SECTION:latest_posts -->\n")
        ]

        # Add the new latest posts
        readme.insert(
            readme.index("<!-- START_SECTION:latest_posts -->\n") + 1,
            "\n".join(latest_post_summaries) + "\n",
        )

    # Open the README.md file again, this time for writing
    with open("README.md", "w") as f:
        f.writelines(readme)
        f.close()
