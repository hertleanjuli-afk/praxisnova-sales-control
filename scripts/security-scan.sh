#!/usr/bin/env bash
set -e
PATTERNS=(
  "sk-[a-zA-Z0-9]{20,}"
  "Bearer [a-zA-Z0-9._-]{30,}"
  "ghp_[a-zA-Z0-9]{30,}"
  "SUPABASE_SERVICE_ROLE_KEY[\"' =:][^[:space:]\"']{30,}"
)
RC=0
for p in "${PATTERNS[@]}"; do
  hits=$(grep -riE --include="*.md" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" --include="*.json" --include="*.env*" --include="*.yml" --include="*.yaml" "$p" . 2>/dev/null | grep -v "node_modules" | grep -v ".git" | grep -v "security-scan.sh" || true)
  if [ -n "$hits" ]; then
    echo "BLOCK: Secret-like pattern found"
    echo "$hits"
    RC=1
  fi
done
if [ $RC -eq 0 ]; then echo "security-scan.sh OK"; fi
exit $RC
