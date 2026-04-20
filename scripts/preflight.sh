#!/usr/bin/env bash
set -e
./scripts/legal-scan.sh || exit 1
./scripts/security-scan.sh || exit 1
if [ -f package.json ]; then
  npm audit --audit-level=high || echo "npm audit warnings, manuell pruefen"
fi
echo "preflight.sh OK"
