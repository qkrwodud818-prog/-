#!/bin/bash
set -euo pipefail

# 클라우드 세션에서만 실행
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

# find-skills 스킬 설치 (이미 있으면 건너뜀)
if [ ! -d "$HOME/.claude/skills/find-skills" ]; then
  npx --yes skills add https://github.com/vercel-labs/skills --skill find-skills -g -a claude-code < /dev/null
fi
