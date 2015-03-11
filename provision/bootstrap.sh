#!/bin/bash
VAGRANT_HOME=/home/vagrant
MONGO_URL=localhost:27017/jsonresume
PROJECT_DIR=/vagrant

sudo apt-get update
sudo apt-get install -y git npm mongodb redis-server

# node setup
sudo ln -s /usr/bin/nodejs /usr/bin/node
cd $PROJECT_DIR
npm install

git submodule update --init --recursive

# mongo config
mongo $MONGO_URL --eval "db.resumes.insert({})"

#
# idempotently add stuff to .profile
#
cd $VAGRANT_HOME

if [ ! -f .profile_user ]; then
    # mongo environment variable
    echo "export MONGOHQ_URL=mongodb://$MONGO_URL" >> .profile_user
    # ensure we `vagrant ssh` into the project directory
    echo "cd $PROJECT_DIR" >> .profile_user
fi

if ! grep -q ".profile_user" $VAGRANT_HOME/.profile; then
    # If not already there, then append command to execute .profile_user to .profile
    echo "if [ -f $VAGRANT_HOME/.profile_user ]; then . $VAGRANT_HOME/.profile_user; fi" >> $VAGRANT_HOME/.profile
fi
source $VAGRANT_HOME/.profile
