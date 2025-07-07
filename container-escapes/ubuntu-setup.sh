#!/bin/bash
#
# This script sets up a new Ubuntu system for the container escapes workshop!

# Set up the environment
export DEBIAN_FRONTEND=noninteractive  # disable interactive prompts
set -e  # exit on error

# Test if the script is run as root
if [ "$(id -u)" -ne 0 ]; then
    echo "This script must be run as root. Use 'sudo' or switch to the root user."
    exit 1
fi

# Run updates
apt-get update -y
apt-get dist-upgrade -y

# Install common packages
apt-get install -y \
    build-essential \
    ca-certificates \
    curl \
    git \
    curl \
    openssh-server \
    wget \
    vim

# Enable SSH
systemctl enable ssh.service
systemctl start ssh.service

# Move to passwordless sudo
sed -i 's/^%sudo\s\+ALL=(ALL:ALL)\s\+ALL/%sudo ALL=(ALL:ALL) NOPASSWD: ALL/' /etc/sudoers

# Add Docker's official GPG key
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc

# Add the repository to Apt sources
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}") stable" | \
  tee /etc/apt/sources.list.d/docker.list > /dev/null
apt-get update

# Install Docker
apt-get install -y \
  docker-ce \
  docker-ce-cli \
  containerd.io \
  docker-buildx-plugin \
  docker-compose-plugin

# Add the current user to the docker group
usermod -aG docker user

# Create flag
echo "hiya, you found me at appsec village @ defcon 33!" | \
  tee -a /boot/flag.txt
