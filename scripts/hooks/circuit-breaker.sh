#!/bin/bash
# Circuit Breaker: 같은 에러 패턴이 60초 안에 5번 반복되면 전략 변경을 경고한다.
# PostToolUse(Bash) 훅으로 등록해서 사용한다.
# 에러 발생 시 /tmp/.2chi_circuit_breaker 에 상태를 기록한다.

STATE_DIR="/tmp/.2chi_circuit_breaker"
mkdir -p "$STATE_DIR"

# exit code가 0이면 성공 — 에러 아님
EXIT_CODE=$(echo "$CLAUDE_TOOL_RESULT" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    print(d.get('exit_code', 0))
except:
    print(0)
" 2>/dev/null)

if [ "$EXIT_CODE" = "0" ] || [ -z "$EXIT_CODE" ]; then
  exit 0
fi

# 에러 메시지 추출 (첫 100자만 해시 키로 사용)
ERROR_MSG=$(echo "$CLAUDE_TOOL_RESULT" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    output = d.get('output', '') or d.get('stderr', '') or str(d)
    # 숫자·경로·타임스탬프 제거해서 패턴화
    import re
    normalized = re.sub(r'[0-9]+', 'N', output[:200])
    normalized = re.sub(r'/[^\s]+', '/PATH', normalized)
    print(normalized[:100].strip())
except:
    print('unknown_error')
" 2>/dev/null)

if [ -z "$ERROR_MSG" ]; then
  exit 0
fi

# 에러 패턴을 파일명으로 해시화
ERROR_HASH=$(echo "$ERROR_MSG" | md5sum | cut -c1-16)
STATE_FILE="$STATE_DIR/$ERROR_HASH"

NOW=$(date +%s)
WINDOW=60   # 60초 슬라이딩 윈도우
THRESHOLD=5 # 5번 반복 시 경고

# 현재 타임스탬프 추가
echo "$NOW" >> "$STATE_FILE"

# 60초 이내 타임스탬프만 필터링
python3 - "$STATE_FILE" "$NOW" "$WINDOW" "$THRESHOLD" << 'PYEOF'
import sys

state_file = sys.argv[1]
now = int(sys.argv[2])
window = int(sys.argv[3])
threshold = int(sys.argv[4])

try:
    with open(state_file, 'r') as f:
        lines = f.read().strip().split('\n')
    timestamps = [int(t) for t in lines if t.strip().isdigit()]
    recent = [t for t in timestamps if now - t <= window]

    # 오래된 항목 정리
    with open(state_file, 'w') as f:
        f.write('\n'.join(str(t) for t in recent) + '\n')

    if len(recent) >= threshold:
        print(f"CIRCUIT_OPEN:{len(recent)}")
    else:
        print(f"OK:{len(recent)}")
except Exception as e:
    print("OK:0")
PYEOF

RESULT=$?
CHECK_OUTPUT=$(python3 - "$STATE_FILE" "$NOW" "$WINDOW" "$THRESHOLD" 2>/dev/null << 'PYEOF'
import sys

state_file = sys.argv[1]
now = int(sys.argv[2])
window = int(sys.argv[3])
threshold = int(sys.argv[4])

try:
    with open(state_file, 'r') as f:
        lines = f.read().strip().split('\n')
    timestamps = [int(t) for t in lines if t.strip().isdigit()]
    recent = [t for t in timestamps if now - t <= window]
    if len(recent) >= threshold:
        print(f"CIRCUIT_OPEN:{len(recent)}")
    else:
        print(f"OK:{len(recent)}")
except:
    print("OK:0")
PYEOF
)

if echo "$CHECK_OUTPUT" | grep -q "CIRCUIT_OPEN"; then
  COUNT=$(echo "$CHECK_OUTPUT" | cut -d: -f2)
  echo "" >&2
  echo "⚡ Circuit Breaker — 같은 에러가 ${COUNT}번 반복됐습니다 (60초 이내)" >&2
  echo "" >&2
  echo "  지금 하는 방식으로는 해결이 안 됩니다. 전략을 바꾸세요:" >&2
  echo "  1. 에러 원인을 다시 분석하라 (원인 가정을 버리고 처음부터)" >&2
  echo "  2. 더 작은 단위로 쪼개서 접근하라" >&2
  echo "  3. 사용자에게 막힌 상황을 보고하고 도움을 요청하라" >&2
  echo "" >&2
  # 상태 파일 초기화 (경고 후 카운터 리셋)
  rm -f "$STATE_FILE"
fi

exit 0
