#!/usr/bin/env bash
# Pre-commit hook for art-core monorepo (art-core, pass-core, prime-core).
# Install:  ln -sf ../../scripts/pre-commit.sh .git/hooks/pre-commit
# Skip (urgence only): git commit --no-verify
#
# Checks (fail-fast):
#   1. No NEW `as any` introduced in staged TS/TSX files
#   2. No secret-looking strings in staged content
#   3. `npx tsc --noEmit` on each app whose files are staged
#   4. `npm run build` on each app whose files are staged (skippable via SKIP_BUILD=1)

set -u
RED=$'\033[31m'; GREEN=$'\033[32m'; YEL=$'\033[33m'; NC=$'\033[0m'

fail() { echo "${RED}✗ $*${NC}" >&2; exit 1; }
warn() { echo "${YEL}! $*${NC}" >&2; }
ok()   { echo "${GREEN}✓ $*${NC}" >&2; }

repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root" || fail "not in a git repo"

staged_files="$(git diff --cached --name-only --diff-filter=ACMR)"
[ -z "$staged_files" ] && { ok "no staged files"; exit 0; }

# ----- 1. No new `as any` in staged TS/TSX -----
new_as_any=0
while IFS= read -r f; do
  case "$f" in *.ts|*.tsx)
    # Diff lines added that contain `as any` (not in a comment)
    added=$(git diff --cached -- "$f" \
      | grep -E '^\+' | grep -v '^\+\+\+' \
      | grep -E '\bas any\b' \
      | grep -vE '^\+\s*//' || true)
    if [ -n "$added" ]; then
      echo "${RED}New 'as any' in $f:${NC}"
      echo "$added" | sed 's/^/    /'
      new_as_any=$((new_as_any + 1))
    fi
  esac
done <<< "$staged_files"
[ "$new_as_any" -gt 0 ] && fail "$new_as_any new 'as any' — fix or justify with comment '// as any: <reason>'"
ok "no new 'as any'"

# ----- 2. Secret-looking strings -----
# Patterns: sk-ant-, sk_live_, sk_test_, vercel_pat_, ghp_, aws_secret, eyJhbGciOi (JWT)
secrets=$(git diff --cached --no-color | grep -E '^\+' | grep -v '^\+\+\+' \
  | grep -E '(sk-ant-api[0-9]+-|sk_live_|sk_test_|vercel_pat_|ghp_[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}|eyJhbGciOi[A-Za-z0-9_-]{20,})' || true)
if [ -n "$secrets" ]; then
  echo "${RED}Possible secret in staged diff:${NC}"
  echo "$secrets" | head -5 | sed 's/^/    /'
  fail "secret-looking string staged — revoke + remove before commit"
fi
ok "no secret-looking strings"

# ----- 3+4. Per-app tsc + build -----
apps_changed=""
for app in art-core pass-core prime-core; do
  if echo "$staged_files" | grep -qE "^${app}/"; then
    apps_changed="$apps_changed $app"
  fi
done

if [ -z "$apps_changed" ]; then
  ok "no app code changed — skipping tsc/build"
  exit 0
fi

for app in $apps_changed; do
  [ -d "$app" ] || { warn "$app dir missing, skip"; continue; }
  echo "── $app ──"
  ( cd "$app" && npx --no-install tsc --noEmit ) || fail "$app: tsc failed"
  ok "$app: tsc OK"

  if [ "${SKIP_BUILD:-0}" = "1" ]; then
    warn "$app: SKIP_BUILD=1 — build skipped"
    continue
  fi
  ( cd "$app" && npm run build --silent ) || fail "$app: build failed"
  ok "$app: build OK"
done

ok "pre-commit OK"
