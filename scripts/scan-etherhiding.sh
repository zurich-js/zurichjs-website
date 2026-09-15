#!/usr/bin/env bash
# Scan the working tree for signatures of the EtherHiding loader.
#
# This repo was infected twice by a workstation-resident infector that appends
# an obfuscated remote-code loader to JS/MJS files (556dba4 and bd6cf2b; both
# cleaned by later commits). The infector may still exist on a contributor
# machine, so CI runs this scan BEFORE `pnpm install` — installing is what
# executes the payload.
#
# Signatures checked:
#   1. The obfuscated identifier `_$_XXXX=(function` — XXXX is 4 HEX chars
#      here (e.g. `_$_913e`), so the widely circulated digit-only pattern
#      `_\$_[0-9]{4}` does NOT match this variant.
#   2. The `global.o='` config marker used by other variants.
#   3. A run of 800+ spaces on one line — the payload hides behind ~2000
#      spaces so it is invisible in editors and lazy diffs.
#   4. The two-line `createRequire(import.meta.url)` ESM shim the infector
#      adds to .mjs files (the payload needs `require`). No legitimate code
#      in this repo uses it; if you add a real use, adjust this check.
#
# Usage: scan-etherhiding.sh [root-dir]   (default: repo root / cwd)

set -euo pipefail

root="${1:-.}"
common=(-rIln --exclude-dir=.git --exclude-dir=node_modules --exclude-dir=.next --exclude="scan-etherhiding.sh")
status=0

check() {
  local label="$1"
  shift
  local hits
  hits=$(grep "$@" "$root" 2>/dev/null || true)
  if [ -n "$hits" ]; then
    echo "FAIL [$label] — EtherHiding signature found:"
    echo "$hits" | sed 's/^/  /'
    status=1
  else
    echo "ok   [$label]"
  fi
}

check "payload-identifier" "${common[@]}" -E '_\$_[0-9a-fA-F]{4}=\(function'
check "payload-marker" "${common[@]}" -F "global.o='"
check "space-padding" "${common[@]}" -E '( {200}){4}' \
  --include='*.js' --include='*.mjs' --include='*.cjs' \
  --include='*.ts' --include='*.tsx' --include='*.jsx'
check "esm-require-shim" "${common[@]}" -F 'createRequire(import.meta.url)' \
  --include='*.mjs' --include='*.js' --include='*.cjs'

if [ "$status" -ne 0 ]; then
  cat <<'EOF'

The tree appears to carry the EtherHiding loader. Do NOT install, build,
lint, or run anything from this checkout — those steps execute the payload.
Treat the committing machine as compromised: the infector re-injects on
commit, so clean the workstation before cleaning the repo.
EOF
fi

exit "$status"
