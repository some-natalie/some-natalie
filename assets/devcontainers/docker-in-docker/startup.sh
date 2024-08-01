#!/bin/bash

echo "Starting dockerd"
dockerd >> /dev/null 2>&1 &

# start a shell by default in the CMD
exec "/bin/bash"
