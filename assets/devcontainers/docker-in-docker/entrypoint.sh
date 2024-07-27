#!/bin/bash

echo "Starting supervisor"
/usr/bin/supervisord -n >> /dev/null 2>&1 &

echo "Starting dockerd"
dockerd >> /dev/null 2>&1 &

# you can probably reduce this or put the dockerd start statement in a loop w/ polling
sleep 10

# start a shell by default in the CMD
exec "$@"
