#!/usr/bin/env bash
set -e
# Exclude meta-docs that reference forbidden phrases for description, not usage:
#   ./Agent build/  - session docs, handovers, platform standards, prompts
#   ./scripts/      - self-reference (this script defines the forbidden list)
#   ./CHANGELOG.md  - historical record
#   ./docs/         - internal documentation referencing legal topics
FORBIDDEN=(
  "Bildungsgutschein"
  "bis 80% foerderbar"
  "bis zu 80% foerderbar"
  "bis 80 Prozent foerderbar"
  "Testsieger"
  "garantierter ROI"
  "garantierte Foerderung"
  "Pilot-Kunden"
  "DSGVO-konform"
)
RC=0
for phrase in "${FORBIDDEN[@]}"; do
  hits=$(grep -riE --include="*.md" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" --include="*.json" --include="*.html" "$phrase" . 2>/dev/null \
    | grep -v "node_modules" \
    | grep -v "^\./\.git/" \
    | grep -v "^\./Agent build/" \
    | grep -v "^\./scripts/" \
    | grep -v "^\./CHANGELOG\.md" \
    | grep -v "^\./docs/" \
    || true)
  if [ -n "$hits" ]; then
    echo "BLOCK: Forbidden phrase found: $phrase"
    echo "$hits"
    RC=1
  fi
done
if [ $RC -eq 0 ]; then echo "legal-scan.sh OK"; fi
exit $RC
