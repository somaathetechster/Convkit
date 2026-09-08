#!/usr/bin/env bash
# Starts the Convkit stack inside the container: the Fastify server and the
# prebuilt Next.js UI, side by side.
#
# This is the production equivalent of `convkit dev`. The CLI is not used here
# because `convkit dev` starts the UI with `next dev` and shells out to pnpm
# in a monorepo layout; this image ships prebuilt output instead.
set -euo pipefail

SERVER_PORT="${PORT:-4000}"
WEB_PORT="${WEB_PORT:-3000}"

server_pid=""
web_pid=""

shutdown() {
  # Forward the signal so both children get a chance to exit cleanly.
  [ -n "$server_pid" ] && kill -TERM "$server_pid" 2>/dev/null || true
  [ -n "$web_pid" ] && kill -TERM "$web_pid" 2>/dev/null || true
  wait 2>/dev/null || true
}
trap shutdown TERM INT

echo "[convkit] starting server on :${SERVER_PORT}"
PORT="$SERVER_PORT" node /app/apps/server/dist/index.js &
server_pid=$!

echo "[convkit] starting web UI on :${WEB_PORT}"
cd /app/apps/web
./node_modules/.bin/next start -p "$WEB_PORT" &
web_pid=$!

# If either process exits, tear the whole container down rather than sitting
# in a half-working state — Docker restart policies can then do their job.
wait -n "$server_pid" "$web_pid"
exit_code=$?
echo "[convkit] a process exited (code ${exit_code}); shutting down"
shutdown
exit "$exit_code"
