#!/usr/bin/env bash
# Restart the production server on :3000 and wait until it answers.
# Kept in a script so the kill pattern never matches the calling shell's own
# command line (which is how `pkill -f` ends up killing its own caller).
set -u

PORT="${1:-3000}"
LOG="${2:-/tmp/cutframe-server.log}"

if command -v fuser >/dev/null 2>&1; then
  fuser -k "${PORT}/tcp" >/dev/null 2>&1 || true
else
  for pid in $(ps -eo pid,args | grep -E 'next-server|next/dist/bin' | grep -v grep | awk '{print $1}'); do
    kill "$pid" 2>/dev/null || true
  done
fi
sleep 2

cd "$(dirname "$0")/.." || exit 1
setsid nohup npx next start -p "$PORT" > "$LOG" 2>&1 < /dev/null &
disown

for _ in $(seq 1 30); do
  code=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${PORT}/" --max-time 8 2>/dev/null || echo 000)
  if [ "$code" = "200" ]; then
    echo "server ready on :${PORT}"
    exit 0
  fi
  sleep 1
done

echo "server did not become ready; last 20 log lines:"
tail -20 "$LOG"
exit 1
