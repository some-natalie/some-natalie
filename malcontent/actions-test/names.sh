#!/bin/bash

names=(
    "uses: actions/test"
    "uses: actions-test/test"
    "uses: actions/test3@v1.0.0"
    "uses: actions/test4@v2"
    "uses: actions/test5@ff0a06e83cb2de871e5a09832bc6a81e7276941f # v3.28.18"
    "uses: actions/test6/test-action@v1.2"
    "uses: actions/test7/test-action@ff0a06e83cb2de871e5a09832bc6a81e7276941f # v3.28.18"
    "uses: actions/test8/nested/test-action@v1.2"
    "uses: actions/test9/nested/test-action@ff0a06e83cb2de871e5a09832bc6a81e7276941f # v3.28.18"
)

# Function to print names
print_names() {
  for name in "${names[@]}"; do
    echo "$name"
  done
}

# Function to extract repository and reference
extract() {
  # Remove diff markers and whitespace, then extract repo and ref
  USE="${ACTION_LINE#-}"
  USE="$(echo "$USE" | xargs)" # trim whitespace
  USE="${USE#uses:}"
  # if there's more than one / in the repo, capture the directory structure
  if [[ $(echo "$USE" | grep -o '/' | wc -l) -gt 1 ]]; then
    ACTION_ORG="${USE%%/*}" # everything before the first /
    ACTION_REPO="${USE#*/}" # remove the first /
    ACTION_REPO="${ACTION_REPO%%/*}" # everything before the next /
    ACTION_DIR="${USE#*/}" # everything after the first /
    ACTION_DIR="${ACTION_DIR#*/}" # do it again
    ACTION_DIR="${ACTION_DIR%@*}" # remove anything after the @
  else
    ACTION_ORG="${USE%%/*}"
    ACTION_REPO="${USE#*/}"
    ACTION_REPO="${ACTION_REPO%%/*}"
    ACTION_REPO="${ACTION_REPO%@*}"
    ACTION_DIR=""
  fi
  REF="${USE##*@}"
  REF="${REF%%#*}" # Remove anything after a '#'
}

for name in "${names[@]}"; do
  ACTION_LINE="$name"
  extract
  echo "Action Org: $ACTION_ORG"
  echo "Action Repo: $ACTION_REPO"
  echo "Action Dir: $ACTION_DIR"
  echo "Action Ref: $REF"
  echo "------------------------"
done
