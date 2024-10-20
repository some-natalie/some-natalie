#!/usr/bin/env python3

"""
This script runs when a new file is added to `_til` directory.

1. Determine which is the latest file
2. Extract content from markdown file
3. Formatting (add hashtags mostly)
4. Post to a given Mastodon server using credentials stored in GitHub secrets

Docs: https://docs.joinmastodon.org/methods/statuses/#create
"""

# Imports
import requests
import os
import frontmatter


# Get the list of filenames in _til, return only the most recent
def get_til_files():
    files = os.listdir("_til")
    files.sort(reverse=True)
    return files[0]


# Get the title, content, and tags
def get_til_data(file):
    post = frontmatter.load("_til/" + file)
    title = post["title"]
    content = post.content
    tags = post["tags"]
    visibility = post["visibility"]
    return title, content, tags, visibility


# Assemble the request - TIL
def post_to_mastodon(title, content, tags, visibility):
    # set headers
    headers = {
        "Authorization": "Bearer " + os.environ["MASTODON_ACCESS_TOKEN"],
        "Idempotency-Key": title,
    }
    # add hashes to each tag
    tags = " ".join(["#" + tag for tag in tags])
    # set data
    disclaimer = "🤖 Cross-posted from https://some-natalie.dev/til/#{} - some formatting may get lost between platforms.".format(title.lower().replace(" ", "-"))
    data = {
        "status": content + "\n\n" + tags + "\n\n" + disclaimer,
        "visibility": visibility,
    }
    # make the request
    response = requests.post(
        "https://" + os.environ["MASTODON_URL"] + "/api/v1/statuses", headers=headers, data=data
    )
    # if the request was successful, print the URL
    if response.status_code == 200:
        print("Posted to Mastodon: " + os.environ["MASTODON_URL"] + "/web/statuses/" + response.json()["id"])


# Run the thing!
if __name__ == "__main__":
    if os.environ.get("POST_TYPE") == "til":
        post = get_til_files()
        title, content, tags, visibility = get_til_data(post)
    else:
        print("No TIL file found")
        exit()
    post_to_mastodon(title, content, tags, visibility)
