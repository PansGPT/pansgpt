#!/usr/bin/env bash
# ========================================================================
# Generate TypeScript types from Supabase schema
# Usage: ./tooling/gen-types.sh [local|linked|<project-id>]
# =======================================================================
set -euo pipefail
OUTPUT=packages/types/src/supabase.ts
TEMP_OUTPUT=$(mktemp)
trap 'rm -f "$TEMP_OUTPUT"' EXIT

TARGET=${1:-"local"}

if [ "$TARGET" = "local" ]; then
  echo "Generating types from local Supabase instance..."
  pnpm exec supabase gen types typescript --local > "$TEMP_OUTPUT"
elif [ "$TARGET" = "linked" ]; then
  echo "Generating types from linked Supabase project..."
  pnpm exec supabase gen types typescript --linked > "$TEMP_OUTPUT"
else
  echo "Generating types from Supabase project $TARGET..."
  pnpm exec supabase gen types typescript --project-id "$TARGET" > "$TEMP_OUTPUT"
fi

test -s "$TEMP_OUTPUT"
mv "$TEMP_OUTPUT" "$OUTPUT"
echo "TypeScript types successfully generated at packages/types/src/supabase.ts"
