#!/usr/bin/env bash
# Starts a throwaway local Postgres for the SQL tests. Nothing here touches your
# real Supabase database — it initialises a fresh cluster in a temp directory.
#
#   bash scripts/sql-test/server.sh start
#   bash scripts/sql-test/run.sh
#   bash scripts/sql-test/server.sh stop
set -euo pipefail

PGBIN="${PGBIN:-/usr/lib/postgresql/16/bin}"
DATA="${PGDATA_DIR:-/var/tmp/cutframe-pgdata}"
SOCKET="${PGSOCKET:-/var/tmp}"
PORT="${PGPORT:-55432}"

case "${1:-start}" in
  start)
    if [ ! -d "$DATA/base" ]; then
      rm -rf "$DATA"
      mkdir -p "$DATA"
      # initdb refuses to run as root, so hand the cluster to an ordinary user
      # when we happen to be root.
      if [ "$(id -u)" = "0" ] && id claude >/dev/null 2>&1; then
        chown claude "$DATA"; chmod 700 "$DATA"
        su claude -c "$PGBIN/initdb -D $DATA -U postgres --auth=trust" >/dev/null
      else
        "$PGBIN/initdb" -D "$DATA" -U postgres --auth=trust >/dev/null
      fi
    fi

    if [ "$(id -u)" = "0" ] && id claude >/dev/null 2>&1; then
      su claude -c "$PGBIN/pg_ctl -D $DATA -o '-p $PORT -k $SOCKET' -l /var/tmp/cutframe-pg.log start"
    else
      "$PGBIN/pg_ctl" -D "$DATA" -o "-p $PORT -k $SOCKET" -l /var/tmp/cutframe-pg.log start
    fi
    ;;
  stop)
    if [ "$(id -u)" = "0" ] && id claude >/dev/null 2>&1; then
      su claude -c "$PGBIN/pg_ctl -D $DATA stop" || true
    else
      "$PGBIN/pg_ctl" -D "$DATA" stop || true
    fi
    ;;
  *)
    echo "Usage: $0 [start|stop]"
    exit 1
    ;;
esac
