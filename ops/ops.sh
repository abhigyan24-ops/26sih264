#!/usr/bin/env bash
# CaseNexus task coordinator. Needs bash + git (Git Bash or WSL on Windows). Run from ANY lane worktree.
# Env: LANE (L1, L2, L3...) and AGENT (CX or AG) must be set for start/reclaim.
set -euo pipefail
COMMON=$(cd "$(git rev-parse --git-common-dir)" && pwd)
MAIN_WT=$(git worktree list --porcelain | awk '/^worktree /{print $2; exit}')
TASKS="$MAIN_WT/ops/TASKS.md"
STATE="$COMMON/ops"; mkdir -p "$STATE/claims" "$STATE/done" "$STATE/locks"
MAIN_BRANCH=${MAIN_BRANCH:-main}
STALE_MIN=${STALE_MIN:-45}

now() { date +%s; }
mt() { stat -c %Y "$1" 2>/dev/null || stat -f %m "$1"; }
ids() { awk '/^## [A-Z][0-9]+/ {print $2}' "$TASKS"; }
card() { awk -v t="$1" '/^## /{p=($2==t)} p' "$TASKS"; }
field() { card "$1" | awk -v f="$2:" 'index($0,f)==1{sub(f" *","");print;exit}'; }
state() { if [ -d "$STATE/done/$1" ]; then echo done; elif [ -d "$STATE/claims/$1" ]; then echo claimed; else echo open; fi; }
age_min() { echo $(( ( $(now) - $(mt "$STATE/claims/$1/beat") ) / 60 )); }
deps_ok() { local d; d=$(field "$1" Depends | tr ',' ' '); for x in $d; do [ "$x" = none ] && continue; [ "$(state "$x")" = done ] || return 1; done; return 0; }
ROOT_NOW=$(git rev-parse --show-toplevel)
need_env() { : "${LANE:?set LANE, e.g. export LANE=L1}"; : "${AGENT:?set AGENT, e.g. export AGENT=CX}"; }
cur_task() { git rev-parse --abbrev-ref HEAD | sed -n 's#^feat/\(.*\)#\1#p'; }

cmd_setup() { # ops.sh setup L1 L2 L3   (run once from the main checkout)
  for l in "$@"; do
    d="$MAIN_WT/../cn-$l"
    [ -d "$d" ] || git worktree add "$d" -b "lane/$l" "$MAIN_BRANCH"
    echo "lane $l -> $d"
  done
}
cmd_status() {
  printf "%-5s %-8s %-6s %-5s %s\n" ID STATE PREFER DEPS TITLE
  for t in $(ids); do
    s=$(state "$t"); extra=""
    if [ "$s" = claimed ]; then extra=" [$(cat "$STATE/claims/$t/lane")/$(cat "$STATE/claims/$t/agent"), idle $(age_min "$t")m]"; fi
    deps=$(deps_ok "$t" && echo ok || echo wait)
    printf "%-5s %-8s %-6s %-5s %s%s\n" "$t" "$s" "$(field "$t" Prefer)" "$deps" "$(card "$t" | head -1 | cut -d' ' -f3-)" "$extra"
  done
}
cmd_next() { # prints the task id to start, or WAIT / ALL_DONE
  local pref=${AGENT:-ANY} open=0 pick="" any="" other=""
  for t in $(ids); do
    case $(state "$t") in done) continue;; claimed) open=1
      [ "$(age_min "$t")" -ge "$STALE_MIN" ] && echo "STALE:$t (idle $(age_min "$t")m; use: ops.sh reclaim $t)"; continue;; esac
    open=1; deps_ok "$t" || continue
    p=$(field "$t" Prefer)
    if [ "$p" = "$pref" ] && [ -z "$pick" ]; then pick=$t; fi
    if [ "$p" = ANY ] && [ -z "$any" ]; then any=$t; fi
    [ -z "$any" ] && [ -z "$other" ] && other=$t
  done
  if [ -n "$pick" ]; then echo "NEXT:$pick"; elif [ -n "$any" ]; then echo "NEXT:$any"; elif [ -n "$other" ]; then echo "NEXT:$other (other agent's preference; allowed)"
  elif [ "$open" = 1 ]; then echo WAIT; else echo ALL_DONE; fi
}
claim_dirs() { mkdir "$STATE/claims/$1" 2>/dev/null || return 1; echo "$LANE" > "$STATE/claims/$1/lane"; echo "$AGENT" > "$STATE/claims/$1/agent"; date -Is > "$STATE/claims/$1/started" 2>/dev/null || date > "$STATE/claims/$1/started"; touch "$STATE/claims/$1/beat"; }
checkout_task() {
  if git show-ref --verify --quiet "refs/heads/feat/$1"; then git checkout "feat/$1"; else git checkout -b "feat/$1" "$MAIN_BRANCH"; fi
}
cmd_start() { need_env; t=$1
  [ "$(state "$t")" = done ] && { echo "$t is already done"; exit 1; }
  [ "${FORCE:-}" = 1 ] || deps_ok "$t" || { echo "dependencies of $t are not done: $(field "$t" Depends)  (deadline override: FORCE=1 ops.sh start $t)"; exit 1; }
  for c in "$STATE"/claims/*; do [ -d "$c" ] && [ "$(cat "$c/lane")" = "$LANE" ] && { echo "lane $LANE already holds $(basename "$c"). Finish it (ops.sh finish) or release it first."; exit 1; }; done
  claim_dirs "$t" || { echo "$t is already claimed by $(cat "$STATE/claims/$t/lane"). Pick another (ops.sh next)."; exit 1; }
  checkout_task "$t" || { rmdir "$STATE/claims/$t" 2>/dev/null; exit 1; }
  echo "=== started $t on branch feat/$t ==="; card "$t"
}
cmd_reclaim() { need_env; t=$1
  [ "$(state "$t")" = claimed ] || { echo "$t is not claimed"; exit 1; }
  [ "$(age_min "$t")" -ge "$STALE_MIN" ] || { echo "$t was active $(age_min "$t")m ago (< $STALE_MIN). Not stale."; exit 1; }
  echo "$LANE" > "$STATE/claims/$t/lane"; echo "$AGENT" > "$STATE/claims/$t/agent"; touch "$STATE/claims/$t/beat"
  old=$(git worktree list --porcelain | awk -v b="refs/heads/feat/$t" '/^worktree /{w=$2} $1=="branch" && $2==b {print w}')
  if [ -n "$old" ] && [ "$old" != "$ROOT_NOW" ]; then
    git -C "$old" add -A && git -C "$old" commit -qm "WIP auto-saved by reclaim ($t)" || true
    git -C "$old" checkout -q --detach
  fi
  checkout_task "$t" || { echo "could not check out feat/$t"; exit 1; }
  echo "=== reclaimed $t; existing commits on feat/$t are kept ==="; git log --oneline "$MAIN_BRANCH"..HEAD || true; card "$t"
}
cmd_release() { t=${1:-$(cur_task)}; rm -rf "$STATE/claims/$t"; echo "released $t (work stays on branch feat/$t)"; }
cmd_beat() { t=${1:-$(cur_task)}; [ -d "$STATE/claims/$t" ] && touch "$STATE/claims/$t/beat" && echo "beat $t"; }
cmd_gate() {
  if [ -n "${GATE_CMD:-}" ]; then bash -c "$GATE_CMD"; return; fi
  if [ -d backend ]; then (cd backend && { command -v uv >/dev/null && uv run pytest -q || python -m pytest -q; }); fi
  if [ -f frontend/package.json ]; then (cd frontend && npx tsc --noEmit && npm run build); fi
}
cmd_finish() { t=${1:-$(cur_task)}; [ -n "$t" ] || { echo "not on a feat/<task> branch"; exit 1; }
  [ "$(git rev-parse --abbrev-ref HEAD)" = "feat/$t" ] || { echo "switch to feat/$t first"; exit 1; }
  [ -z "$(git status --porcelain)" ] || { echo "uncommitted changes; commit first"; exit 1; }
  [ -s "docs/reports/$t.md" ] || { echo "missing docs/reports/$t.md (report is required)"; exit 1; }
  for i in $(seq 1 120); do mkdir "$STATE/locks/merge" 2>/dev/null && break; sleep 5; [ "$i" = 120 ] && { echo "merge lock busy >10min"; exit 1; }; done
  trap 'rmdir "$STATE/locks/merge" 2>/dev/null || true' EXIT
  git rebase "$MAIN_BRANCH" || { git rebase --abort; echo "REBASE CONFLICT. Resolve only in files this task owns, or stop and write the problem in docs/reports/$t.md"; exit 2; }
  cmd_gate || { echo "GATE FAILED. Fix, commit, run finish again."; exit 3; }
  git -C "$MAIN_WT" merge --ff-only "feat/$t"
  mkdir -p "$STATE/done/$t"; rm -rf "$STATE/claims/$t"
  echo "=== $t merged into $MAIN_BRANCH and marked done ==="
}
case "${1:-}" in
  setup) shift; cmd_setup "$@";; status) cmd_status;; next) cmd_next;; start) cmd_start "$2";;
  reclaim) cmd_reclaim "$2";; release) shift; cmd_release "${1:-}";; beat) shift; cmd_beat "${1:-}";;
  gate) cmd_gate;; finish) shift; cmd_finish "${1:-}";;
  *) echo "usage: ops.sh setup L1 L2 | status | next | start T | beat | gate | finish [T] | reclaim T | release [T]";;
esac
