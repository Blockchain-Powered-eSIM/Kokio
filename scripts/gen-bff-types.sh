#!/usr/bin/env bash
set -euo pipefail

SPEC="kokio-bff-openapi-source.json"
OUT="utils/bff/generated/koKioBff.d.ts"

if [ ! -f "$SPEC" ]; then
  echo "Error: $SPEC not found at project root" >&2
  exit 1
fi

node_modules/.bin/openapi-typescript "$SPEC" -o "$OUT"
echo "Generated $OUT"
