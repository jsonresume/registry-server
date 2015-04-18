# JSON Resume Registry Server

[![Build Status](https://api.travis-ci.org/jsonresume/registry-server.svg)](http://travis-ci.org/jsonresume/registry-server)

## Installation

Requirements: MongoDB, Redis

1. Clone the repository
1. `npm install`
1. `git submodule update --init --recursive`
1. `mongo localhost:27017/jsonresume --eval "db.resumes.insert({})"`
1. `MONGOHQ_URL=mongodb://localhost:27017/jsonresume node server.js`

*Alternatively:*

Requirements: Vagrant, Virtualbox

1. Clone the repository
1. `vagrant up`
1. `vagrant ssh`
1. `node server.js`

## Testing

To run the tests, simply run:

    npm run test:dev

## Documentation
For additional documentation please see the [Wiki page](https://github.com/jsonresume/resume-docs/wiki/Registry-Server).

## License

Available under [the MIT license](http://mths.be/mit).
