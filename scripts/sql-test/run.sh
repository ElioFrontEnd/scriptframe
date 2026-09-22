#!/usr/bin/env bash
# Loads supabase/schema.sql into a throwaway Postgres and exercises the credit
# and claim functions, including under real concurrency.
#
#   bash scripts/sql-test/run.sh
#
# Needs a Postgres server reachable at $PGHOST:$PGPORT (defaults below match
# what scripts/sql-test/server.sh starts).
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"

export PGHOST="${PGHOST:-/var/tmp}"
export PGPORT="${PGPORT:-55432}"
export PGUSER="${PGUSER:-postgres}"
DB="cutframe_test_$$"

psql -q -d postgres -c "create database $DB" >/dev/null
trap 'psql -q -d postgres -c "drop database if exists $DB" >/dev/null 2>&1 || true' EXIT

run() { psql -q -v ON_ERROR_STOP=1 -d "$DB" "$@"; }

echo "Loading schema…"
run -f "$HERE/00-stubs.sql" >/dev/null
run -f "$ROOT/supabase/schema.sql" >/dev/null
echo "  ok   supabase/schema.sql loads cleanly"
run -f "$ROOT/supabase/migration-002-custom-styles.sql" >/dev/null
echo "  ok   migration 002 applies on top of it"
# Applying a migration twice is a normal accident; it must be harmless.
run -f "$ROOT/supabase/migration-002-custom-styles.sql" >/dev/null
echo "  ok   migration 002 is safe to re-run"
run -f "$ROOT/supabase/migration-003-timestamps.sql" >/dev/null
echo "  ok   migration 003 applies on top of it"
run -f "$ROOT/supabase/migration-003-timestamps.sql" >/dev/null
echo "  ok   migration 003 is safe to re-run"
run -f "$ROOT/supabase/migration-004-purchases.sql" >/dev/null
echo "  ok   migration 004 applies on top of it"
run -f "$ROOT/supabase/migration-004-purchases.sql" >/dev/null
echo "  ok   migration 004 is safe to re-run"
run -f "$ROOT/supabase/migration-005-payment-ref.sql" >/dev/null
echo "  ok   migration 005 applies on top of it"
run -f "$ROOT/supabase/migration-005-payment-ref.sql" >/dev/null
echo "  ok   migration 005 is safe to re-run"
run -f "$ROOT/supabase/migration-006-abuse.sql" >/dev/null
echo "  ok   migration 006 applies on top of it"
run -f "$ROOT/supabase/migration-006-abuse.sql" >/dev/null
echo "  ok   migration 006 is safe to re-run"

echo
echo "Function behaviour:"
# psql writes RAISE NOTICE to stderr and prefixes it with the file name; strip
# that back to the assertion text. Exit status is captured separately so the
# formatting pipeline can't swallow a failure.
set +e
BEHAVIOUR=$(psql -v ON_ERROR_STOP=1 -d "$DB" -f "$HERE/10-tests.sql" 2>&1)
BEHAVIOUR_STATUS=$?
set -e
echo "$BEHAVIOUR" | sed -n 's/.*NOTICE:  //p'
if [ "$BEHAVIOUR_STATUS" != "0" ]; then
  echo "$BEHAVIOUR" | grep -E "ERROR|FAILED" || true
  echo
  echo "SQL behaviour tests FAILED."
  exit 1
fi

# ---------------------------------------------------------------- concurrency
# The guarantee that matters: two requests must never both spend the last
# credits. Twenty parallel processes each try to take 10 from a balance of 100,
# so exactly ten must succeed and the balance must land on zero — never below.
echo
echo "Concurrency:"
USER_ID=$(run -t -A -c "insert into auth.users (email) values ('race@example.com') returning id" | tr -d '[:space:]')
run -c "update public.profiles set credits = 100 where id = '$USER_ID'" >/dev/null
JOB_ID=$(run -t -A -c "insert into public.jobs (user_id, title, script, style_id, image_count) values ('$USER_ID','race','s','handdrawn-educational',10) returning id" | tr -d '[:space:]')

RESULTS=$(mktemp)
for _ in $(seq 1 20); do
  (psql -q -t -A -d "$DB" -c "select public.spend_credits('$USER_ID', 10, '$JOB_ID')" >> "$RESULTS" 2>/dev/null) &
done
wait

WON=$(grep -c '^t$' "$RESULTS" || true)
LOST=$(grep -c '^f$' "$RESULTS" || true)
BAL=$(run -t -A -c "select credits from public.profiles where id = '$USER_ID'" | tr -d '[:space:]')
LEDGER=$(run -t -A -c "select coalesce(sum(delta),0) from public.credit_transactions where user_id='$USER_ID' and reason='generation'" | tr -d '[:space:]')
rm -f "$RESULTS"

fail=0
check() { if [ "$2" = "$3" ]; then echo "  ok   $1"; else echo "  FAIL $1 (got $2, want $3)"; fail=1; fi; }

check "exactly 10 of 20 parallel spends succeed" "$WON" "10"
check "the other 10 are refused"                 "$LOST" "10"
check "balance lands on zero, never negative"    "$BAL" "0"
check "ledger matches what was spent"            "$LEDGER" "-100"

# --------------------------------------------------- concurrent frame claims
# Two workers ticking at once must take disjoint frames, or an image gets
# generated — and charged — twice.
echo
JOB2=$(run -t -A -c "insert into public.jobs (user_id, title, script, style_id, image_count) values ('$USER_ID','claims','s','handdrawn-educational',40) returning id" | tr -d '[:space:]')
run -c "insert into public.job_images (job_id, idx, prompt) select '$JOB2', g, 'p'||g from generate_series(0,39) g" >/dev/null

CLAIMS=$(mktemp)
for _ in $(seq 1 8); do
  (psql -q -t -A -d "$DB" -c "select idx from public.claim_images('$JOB2', 5)" >> "$CLAIMS" 2>/dev/null) &
done
wait

TOTAL=$(grep -c '[0-9]' "$CLAIMS" || true)
UNIQUE=$(grep '[0-9]' "$CLAIMS" | sort -u | wc -l | tr -d '[:space:]')
rm -f "$CLAIMS"

check "8 parallel workers claim 40 frames"    "$TOTAL" "40"
check "no frame is claimed twice"             "$UNIQUE" "40"

echo
if [ "$fail" = "0" ]; then
  echo "All SQL tests passed."
else
  echo "SQL tests FAILED."
  exit 1
fi
