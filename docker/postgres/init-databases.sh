#!/bin/bash
set -e

# Creates additional databases from POSTGRES_EXTRA_DATABASES (comma-separated).
# The default database (POSTGRES_DB) is created automatically by the official image.
# Example: POSTGRES_EXTRA_DATABASES=games,wallets

if [ -n "$POSTGRES_EXTRA_DATABASES" ]; then
  IFS=',' read -ra DATABASES <<< "$POSTGRES_EXTRA_DATABASES"
  for db in "${DATABASES[@]}"; do
    db=$(echo "$db" | xargs) # trim whitespace
    echo "Creating database: $db"
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -c "CREATE DATABASE \"$db\" WITH ENCODING 'UTF8' LC_COLLATE='en_US.utf8' LC_CTYPE='en_US.utf8' TEMPLATE=template0" 2>/dev/null || echo "Database '$db' already exists."
    echo "Database '$db' created (or already exists)."
  done
fi

echo "Setting wallet balances to STARTING_BALANCE..."
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "wallets" -c "UPDATE wallet SET balance = ${STARTING_BALANCE:-1000000} WHERE balance != ${STARTING_BALANCE:-1000000};" 2>/dev/null || true
echo "Wallet balances updated."
