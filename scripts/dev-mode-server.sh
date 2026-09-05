#!/usr/bin/env bash
# Runs `next dev` on :3001 so development-only routes (the component preview)
# can be screenshotted. Kept in a script so the kill pattern never matches the
# calling shell's own command line.
set -u

PORT="${1:-3001}"
LOG="${2:-/tmp/cutframe-dev.log}"

if command -v fuser >/dev/null 2>&1; then
  fuser -k "${PORT}/tcp" >/dev/null 2>&1 || true
fi
sleep 1

cd "$(dirname "$0")/.." || exit 1
setsid nohup npx next dev -p "$PORT" > "$LOG" 2>&1 < /dev/null &
disown

for _ in $(seq 1 60); do
  code=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${PORT}/dev/preview" --max-time 20 2>/dev/null || echo 000)
  if [ "$code" = "200" ]; then
    echo "dev server ready on :${PORT}"
    exit 0
  fi
  sleep 2
done

echo "dev server did not become ready; last 25 log lines:"
tail -25 "$LOG"
exit 1
