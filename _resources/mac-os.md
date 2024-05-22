---
title: "MacOS commands"
excerpt: "functions and more for MacOS"
---

## Update it all

```shell
function mac-updates {
  # Homebrew - https://brew.sh
  echo "Updating Homebrew ..."
  brew update
  brew upgrade
  brew cleanup

  # Vim configs - https://github.com/amix/vimrc
  echo "Updating Vim configs ..."
  cd .vim_runtime && python3 update_plugins.py && cd ..

  # tl;dr pages - https://tldr.sh
  echo "Updating tl;dr pages ..."
  tldr --update

  # GH CLI extensions - https://cli.github.com
  echo "Updating GitHub CLI extensions ..."
  gh extension upgrade --all

  # Helm - https://helm.sh
  echo "Updating Helm repos ..."
  helm repo update

  # Oh my zsh - https://ohmyz.sh
  echo "Updating Oh My Zsh ..."
  omz update

  # Nmap scripts - https://nmap.org
  echo "Updating Nmap scripts ..."
  nmap --script-updatedb
  
  # Update go modules
  echo "Updating public go modules ..."
  go install github.com/chainguard-dev/bincapz@latest
  echo "Updating private go modules ..." 
  GOPRIVATE=github.com/ORG/REPO go install github.com/ORG/REPO@TAG

  # Update Python packages
  echo "Updating Python packages ..."
  pip3 freeze --local | grep -v '^\-e' | grep -v '@' | cut -d = -f 1 | xargs pip3 install -U --ignore-installed --break-system-packages
}
```
