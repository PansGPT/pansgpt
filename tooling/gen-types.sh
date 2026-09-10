#!/usr/bin/env bash
# ========================================================================
# Generate TypeScript types from Supabase schema
# Usage: ./tooling/gen-types.sh [local|linked|<project-id>]
# =======================================================================
set -e

TARGET=${1:-"local"}

if [ "$TARGET" = "local" ]; then
  echo "Generating types from local Supabase instance..."
  pnpm exec supabase gen types typescript --local > packages/types/src/supabase.ts
elif [ "$TARGET" = "linked" ]; then
  echo "Generating types from linked Supabase project..."
  pnpm exec supabase gen types typescript --linked > packages/types/src/supabase.ts
else
  echo "Generating types from Supabase project $TARGET..."
  pnpm exec supabase gen types typescript --project-id "$TARGET" > packages/types/src/supabase.ts
fi

echo "TypeScript types successfully generated at packages/types/src/supabase.ts"
