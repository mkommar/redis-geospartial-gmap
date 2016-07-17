## Production
    git clone https://amokrushin@bitbucket.org/amokrushin/bitbucket-redis-geospartial-gmap.git redis-geospartial-gmap
    cd redis-geospartial-gmap
    npm i --production

### App configuration
    cp config.defaults.json config.json     # make config.json file from default one
    nano config.json                        # set config values

### App start
    pm2 start pm2-production.json          # start app in production mode

### Update
    npm run force-update                    # reset changes except of ignored files like config.json then pull updates
    npm update                              # update node modules
    npm run deploy                          # frontend build
    pm2 start pm2-production.json           # restart app



## Development

### Installation
    git clone https://amokrushin@bitbucket.org/amokrushin/bitbucket-redis-geospartial-gmap.git dev.redis-geospartial-gmap
    cd dev.redis-geospartial-gmap
    npm i                                   # install all dependencies

### App configuration
    cp config.defaults.json config.json     # make config.json file from default one
    nano config.json                        # set config values

### App start
    pm2 start pm2-development.json          # start app in development mode

### Update
    npm run force-update
    pm2 start pm2-development.json



## Admin CLI interface

    node ./bin/admin

    local@redis-geospartial-gmap~$ help
        Commands:
        help [command...]      Provides help for a given command.
        exit                   Exits application.
        flush-model [model]
        rebuild-index [model]
        add-admin-role
        remove-admin-role

## GIT (npm install private modules)

Generate keypair

    $ ssh-keygen -t rsa -b 4096 -f ~/.ssh/bitbucket-redis-geospartial-gmap
    $ chmod 700 ~/.ssh/bitbucket-redis-geospartial-gmap*

Add the public key to bitbucket.org

    Manage Account > SSH Keys > Add Key

Add private key to local session

    $ eval `ssh-agent -s`
    $ ssh-add ~/.ssh/bitbucket-redis-geospartial-gmap

Test SSH Access

    $ ssh -T git@bitbucket.org