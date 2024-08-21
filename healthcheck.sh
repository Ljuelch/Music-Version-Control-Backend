#!/bin/bash

URL="http://localhost:3000"

result=$(wget --spider --server-response "$URL" 2>&1 | grep "HTTP/" | awk '{print $2}' | tail -1)

if [[ $result -eq 200 ]]; then
  exit 0
else
  exit 1
fi