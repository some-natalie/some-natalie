#!/bin/bash

# create 5 files, each 10 MB in size and full of random data
for i in {1..5}; do
  dd if=/dev/urandom of=file$i.txt bs=1M count=10
done
