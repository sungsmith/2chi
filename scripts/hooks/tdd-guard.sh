#!/bin/bash
# TDD Guard: 구현 파일 수정 시 대응하는 테스트 파일이 없으면 수정을 차단한다.
# PreToolUse(Edit, Write) 훅으로 등록해서 사용한다.

FILE_PATH=$(echo "$CLAUDE_TOOL_INPUT" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    print(d.get('file_path', ''))
except:
    print('')
" 2>/dev/null)

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# 테스트 파일 자체는 통과
if echo "$FILE_PATH" | grep -qE '\.(test|spec)\.(ts|tsx|js|jsx)$'; then
  exit 0
fi

# 설정·타입·인덱스 파일은 통과
if echo "$FILE_PATH" | grep -qE '\.(config|d)\.(ts|js)$|/types/|/types\.ts$|/index\.(ts|tsx)$|\.json$|\.md$|\.env|Dockerfile|docker-compose'; then
  exit 0
fi

# apps/ 또는 packages/ 하위 TypeScript 구현 파일에만 적용
if ! echo "$FILE_PATH" | grep -qE '\.(ts|tsx)$'; then
  exit 0
fi

if ! echo "$FILE_PATH" | grep -qE '^(apps|packages)/'; then
  exit 0
fi

DIR=$(dirname "$FILE_PATH")
BASENAME=$(basename "$FILE_PATH" | sed 's/\.\(ts\|tsx\)$//')

# 가능한 테스트 파일 위치를 순서대로 확인
FOUND=false
for TEST_PATH in \
  "${DIR}/${BASENAME}.spec.ts" \
  "${DIR}/${BASENAME}.test.ts" \
  "${DIR}/${BASENAME}.spec.tsx" \
  "${DIR}/${BASENAME}.test.tsx" \
  "${DIR}/__tests__/${BASENAME}.spec.ts" \
  "${DIR}/__tests__/${BASENAME}.test.ts" \
  "${DIR}/__tests__/${BASENAME}.spec.tsx" \
  "${DIR}/__tests__/${BASENAME}.test.tsx"; do
  if [ -f "$TEST_PATH" ]; then
    FOUND=true
    break
  fi
done

if [ "$FOUND" = "false" ]; then
  echo "🚫 TDD Guard: 테스트 파일이 없습니다." >&2
  echo "   대상 파일: $FILE_PATH" >&2
  echo "   테스트를 먼저 작성하세요: ${DIR}/${BASENAME}.spec.ts" >&2
  echo "   (테스트 작성 면제 파일이면 훅을 우회하려면 파일 경로에 '.config.' 또는 '/types/'를 포함하세요)" >&2
  exit 1
fi

exit 0
