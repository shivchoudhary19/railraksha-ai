#!/bin/sh
set -eu
psql --username "$POSTGRES_USER" --dbname postgres \
  --set=app_password="$APP_DB_PASSWORD" --set=owner_password="$OWNER_DB_PASSWORD" \
  --set=kc_password="$KEYCLOAK_DB_PASSWORD" <<'SQL'
CREATE ROLE railraksha_owner LOGIN PASSWORD :'owner_password';
CREATE ROLE railraksha LOGIN PASSWORD :'app_password';
CREATE ROLE keycloak LOGIN PASSWORD :'kc_password';
CREATE DATABASE railraksha OWNER railraksha_owner;
CREATE DATABASE keycloak OWNER keycloak;
REVOKE ALL ON DATABASE railraksha FROM PUBLIC;
GRANT CONNECT ON DATABASE railraksha TO railraksha;
\connect railraksha
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO railraksha;
SQL
