#!/usr/bin/env bash
# Reports hex colour literals in app/components/*.tsx — ratchet baseline.
# Tokens live in app/lib/helpers.tsx and should be used instead.
# Exits 1 if the count exceeds the baseline.

set -e
cd "$(dirname "$0")/.."

BASELINE_FILE=".token-baseline"
BASELINE=$(cat "$BASELINE_FILE" 2>/dev/null || echo "240")

COUNT=$(grep -rEho '#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3}\b' app/components/*.tsx app/page.tsx 2>/dev/null | wc -l | tr -d ' ')

echo "Hex literals in components: $COUNT (baseline: $BASELINE)"

if [ "$COUNT" -gt "$BASELINE" ]; then
  echo ""
  echo "FAIL — hex literal count went up. Use tokens from app/lib/helpers.tsx instead."
  echo "Top offending files:"
  grep -rEoh '#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3}\b' app/components/*.tsx app/page.tsx 2>/dev/null | sort | uniq -c | sort -rn | head -10
  echo ""
  echo "If this is intentional, update $BASELINE_FILE."
  exit 1
fi

if [ "$COUNT" -lt "$BASELINE" ]; then
  echo ""
  echo "Hex count went down by $((BASELINE - COUNT)) — nice. Update $BASELINE_FILE to $COUNT to lock in."
fi
