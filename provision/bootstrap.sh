#!/bin/bash

source /vagrant/provision/constants.sh
source /vagrant/provision/utils.sh

echo_heading "Update and install packages"
sudo apt-get update -qq
sudo apt-get install -y curl git mongodb redis-server

echo_heading "Installing latest stable NodeJS using NVM"
curl --compressed -s0- https://raw.githubusercontent.com/creationix/nvm/v0.33.2/install.sh | bash
source "$VAGRANT_HOME/.nvm/nvm.sh"
nvm install 4

echo_heading "Setting up NodeJS and project"
cd "$PROJECT_DIR"
npm install

git submodule update --init --recursive --depth 1

# mongo config
mongo "$MONGO_URL" --eval "db.resumes.insert({})"

echo_heading "Idempotently add stuff to .profile"
cd "$VAGRANT_HOME"
# If not already there, then append command to execute .profile_additions to .profile
if ! grep -q ".profile_additions" "$VAGRANT_HOME/.profile"; then
  echo "source $PROVISION_DIR/.profile_additions" >> "$VAGRANT_HOME/.profile"
fi

echo -e "\nFinished provisioning"
