#!/bin/bash
# wait-for-it.sh: Wait for a service to be available before executing a command

set -e

host="$1"
port="$2"
shift 2
cmd="$@"

until mysqladmin ping -h "$host" -P "$port" --silent; do
  >&2 echo "MySQL is unavailable - sleeping"
  sleep 1
done

>&2 echo "MySQL is up - executing command"
exec $cmd