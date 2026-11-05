#!/bin/sh
set -eu

if [ "$#" -ne 1 ] || [ ! -f "$1" ]; then
  echo "Usage: $0 /path/to/bookDB.dump" >&2
  exit 1
fi

cd "$(dirname "$0")"
umask 077
mkdir -p seed
base64 "$1" > seed/bookDB.dump.b64
echo 'Prepared deploy/seed/bookDB.dump.b64. This seed is used only for a new PostgreSQL data volume.'
