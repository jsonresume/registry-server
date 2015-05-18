#!/bin/bash

source /vagrant/provision/constants.sh
source /vagrant/provision/utils.sh

echo_heading "Update and install packages"
{
  sudo apt-get update -qq
  sudo add-apt-repository ppa:git-core/ppa # for git v2+
  sudo apt-get update -qq
  sudo apt-get install -y git mongodb redis-server
  sudo apt-get install -y build-essential libssl-dev curl # for NVM
} > /dev/null

echo_heading "Installing latest stable NodeJS using NVM"
{
  curl -s https://raw.githubusercontent.com/creationix/nvm/v0.24.1/install.sh | bash
  chmod +x $VAGRANT_HOME/.nvm/nvm.sh
  source $VAGRANT_HOME/.nvm/nvm.sh
  nvm install v0.10 >/dev/null 2>&1 # noisy
  nvm alias default v0.10
} > /dev/null

echo_heading "Setting up NodeJS and project"
{
  cd $PROJECT_DIR
  npm install

  git submodule update --init --recursive --depth 1

  # mongo config
  mongo $MONGO_URL --eval "db.resumes.insert({})"
} > /dev/null

echo_heading "Idempotently add stuff to .profile"
cd $VAGRANT_HOME
# If not already there, then append command to execute .profile_additions to .profile
if ! grep -q ".profile_additions" $VAGRANT_HOME/.profile; then
  echo "source $PROVISION_DIR/.profile_additions" >> $VAGRANT_HOME/.profile
fi

echo -e "\nFinished provisioning"
