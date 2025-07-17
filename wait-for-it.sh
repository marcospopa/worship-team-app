#!/bin/bash
# wait-for-it.sh: Wait for a service to be available before executing a command

set -e

# Expect first argument in the form host:port
hostport="$1"
if [ -z "$hostport" ]; then
  >&2 echo "Error: No host:port provided"
  exit 1
fi

# Split host:port
host=$(echo "$hostport" | cut -d: -f1)
port=$(echo "$hostport" | cut -d: -f2)

# Debug: Print host and port to verify
echo "Waiting for $host:$port"

if [ -z "$host" ] || [ -z "$port" ]; then
  >&2 echo "Error: Invalid host:port format. Expected host:port, got $hostport"
  exit 1
fi

shift
cmd="$@"

if [ -z "$cmd" ]; then
  >&2 echo "Error: No command provided"
  exit 1
fi

until nc -z -w 5 "$host" "$port"; do
  >&2 echo "$host:$port is unavailable - sleeping"
  sleep 1
done

>&2 echo "$host:$port is up - executing command: $cmd"
exec $cmd