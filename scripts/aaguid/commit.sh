#!/bin/sh
set -e

FILE="./src/lib/auth/aaguid/aaguid.json"

if git diff --quiet -- "$FILE"; then
  echo "No changes in $FILE"
  exit 0
fi

DATE=$(date "+%Y/%m/%d %H:%M(%z)")

git add "$FILE"
git commit -m "[update aaguid] $DATE"
