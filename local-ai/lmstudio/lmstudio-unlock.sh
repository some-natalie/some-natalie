#!/usr/bin/env zsh
# Drop LM Studio's "must run from /Applications" check so a non-admin user can run
# it from ~/Applications.  https://github.com/lmstudio-ai/lmstudio-bug-tracker/issues/707
#
# Needs your terminal listed under System Settings > Privacy & Security > App
# Management.  Re-run after every LM Studio update.
set -euo pipefail

die() { print -u2 "$@"; exit 1 }

app=${1:-$HOME/Applications/LM Studio.app}
app=${app%/}
app=${app%.app}.app
# the issue's workaround renames the bundle; put the extension back either way
[[ -d $app || ! -d ${app%.app} ]] || mv "${app%.app}" "$app"
[[ -d $app ]] || die "no bundle at $app"

js=$app/Contents/Resources/app/.webpack/main/index.js
[[ -f $js ]] || die "missing $js"

# The path lives in the obfuscator's string table, where it is the only user of the
# literal -- rewriting it there survives the per-build identifier churn.
hits=$({ grep -o "'/Applications'" "$js" || true } | wc -l | tr -d ' ')
case $hits in
  0) print "already patched -- nothing to do"; exit 0 ;;
  1) ;;
  *) die "expected 1 occurrence of '/Applications', found $hits -- refusing to guess" ;;
esac

[[ -f $js.orig ]] || cp -c "$js" "$js.orig" 2>/dev/null ||
  die "cannot write inside the bundle -- add your terminal to System Settings > Privacy & Security > App Management"

sed -i '' "s|'/Applications'|'/'|" "$js"
grep -q "'/Applications'" "$js" && die "patch did not apply"

print "patched $js"
print "backup: $js.orig"
