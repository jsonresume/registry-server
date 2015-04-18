#!/bin/bash

source /vagrant/provision/constants.sh
source /vagrant/provision/utils.sh

echo_heading "Update and install packages"
{
  sudo apt-get update -qq
  sudo apt-get install -y git npm mongodb redis-server
} > /dev/null

echo_heading "Setting up NodeJS and project"
{
  sudo ln -s /usr/bin/nodejs /usr/bin/node
  cd $PROJECT_DIR
  npm install

  git submodule update --init --recursive

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
