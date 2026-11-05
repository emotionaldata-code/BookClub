#!/bin/sh
set -eu

# PostgreSQL runs this only when its data volume is empty.
seed_file=$(mktemp /tmp/bookclub-seed.XXXXXX)
trap 'rm -f "$seed_file"' EXIT
base64 -d /seed/bookDB.dump.b64 > "$seed_file"
echo 'Restoring the initial BookClub database into the new data volume...'
pg_restore --exit-on-error --single-transaction --no-owner --no-privileges \
  --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" "$seed_file"
echo 'BookClub initial database restored.'
