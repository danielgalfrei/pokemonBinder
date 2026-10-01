#!/usr/bin/env bash
# Lanza pokemonBinder en local. Uso: ./start.sh [puerto]   (por defecto 5173)
set -e
cd "$(dirname "$0")/src"
PORT="${1:-5173}"

if command -v python3 >/dev/null 2>&1 && python3 -c "" 2>/dev/null; then PY=python3
elif command -v python >/dev/null 2>&1 && python -c "" 2>/dev/null; then PY=python
elif command -v py >/dev/null 2>&1; then PY="py -3"
else echo "Error: se necesita Python 3 (https://www.python.org/downloads/)"; exit 1; fi

URL="http://localhost:$PORT"
echo "pokemonBinder -> $URL  (Ctrl+C para parar)"
( sleep 1; { start "" "$URL" || xdg-open "$URL" || open "$URL"; } >/dev/null 2>&1 ) &
exec $PY -m http.server "$PORT" --bind 127.0.0.1
