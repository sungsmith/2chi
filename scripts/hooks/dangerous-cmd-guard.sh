#!/bin/bash
# Dangerous Cmd Guard: 위험한 명령어 실행 전 차단한다.
# PreToolUse(Bash) 훅으로 등록해서 사용한다.

COMMAND=$(echo "$CLAUDE_TOOL_INPUT" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    print(d.get('command', ''))
except:
    print('')
" 2>/dev/null)

if [ -z "$COMMAND" ]; then
  exit 0
fi

BLOCKED=false
REASON=""

# 파일 시스템 파괴
if echo "$COMMAND" | grep -qE 'rm\s+-rf\s+[^-]|rm\s+--force\s+-r|rm\s+-fr'; then
  BLOCKED=true
  REASON="rm -rf: 복구 불가능한 파일 삭제"
fi

# Git 강제 조작
if echo "$COMMAND" | grep -qE 'git\s+push\s+(--force|-f)\b'; then
  BLOCKED=true
  REASON="git push --force: 원격 브랜치 히스토리 파괴"
fi

if echo "$COMMAND" | grep -qE 'git\s+reset\s+--hard'; then
  BLOCKED=true
  REASON="git reset --hard: 커밋되지 않은 변경사항 영구 삭제"
fi

if echo "$COMMAND" | grep -qE 'git\s+clean\s+.*-f'; then
  BLOCKED=true
  REASON="git clean -f: 추적되지 않는 파일 영구 삭제"
fi

if echo "$COMMAND" | grep -qE 'git\s+checkout\s+--\s+\.'; then
  BLOCKED=true
  REASON="git checkout -- .: 작업 디렉토리 변경사항 전체 폐기"
fi

# DB 파괴
if echo "$COMMAND" | grep -qE 'DROP\s+TABLE|DROP\s+DATABASE|TRUNCATE\s+TABLE'; then
  BLOCKED=true
  REASON="DDL 파괴 명령: DB 데이터 영구 삭제"
fi

# Prisma 위험 명령
if echo "$COMMAND" | grep -qE 'prisma\s+migrate\s+reset'; then
  BLOCKED=true
  REASON="prisma migrate reset: DB 전체 초기화"
fi

# Docker 볼륨 파괴
if echo "$COMMAND" | grep -qE 'docker(-compose)?\s+(down|rm)\s+.*(-v|--volumes)'; then
  BLOCKED=true
  REASON="docker down -v: 모든 볼륨(DB 데이터 포함) 삭제"
fi

if [ "$BLOCKED" = "true" ]; then
  echo "🚫 Dangerous Cmd Guard: 위험한 명령어가 차단되었습니다." >&2
  echo "   이유: $REASON" >&2
  echo "   명령어: $COMMAND" >&2
  echo "   정말 필요하다면 사용자가 직접 터미널에서 실행하세요." >&2
  exit 1
fi

exit 0
