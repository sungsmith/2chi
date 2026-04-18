# UI 디자인 가이드 — 이취 (2chi)

## 디자인 원칙

1. **도구처럼 보여야 한다** — 취준생이 매일 쓰는 대시보드. 마케팅 랜딩페이지가 아님. 기능이 장식보다 항상 앞에 나온다.
2. **읽기·쓰기에 최적화** — 자소서를 쓰고 이력을 정리하는 서비스. 눈이 편한 라이트 모드, 넉넉한 줄간격, 선명한 텍스트 대비.
3. **정보 밀도** — 한 화면에 필요한 정보를 다 보여준다. 빈 공간 낭비 없이, 그렇다고 과밀하지도 않게.

---

## AI 슬롭 안티패턴 — 절대 하지 마라

| 금지 사항 | 이유 |
|-----------|------|
| `backdrop-filter: blur()` | glass morphism = AI 템플릿의 가장 흔한 징후 |
| gradient-text | AI가 만든 SaaS 랜딩의 1번 특징 |
| "Powered by AI" 배지 | 기능이 아닌 장식. 사용자에게 가치 없음 |
| box-shadow 글로우 애니메이션 | 네온 글로우 = AI 슬롭 |
| 보라/인디고 브랜드 색상 | "AI = 보라색" 클리셰 |
| 모든 카드에 동일한 rounded-2xl | 균일한 큰 둥근 모서리 = 템플릿 느낌 |
| 배경 gradient orb (blur-3xl 원형) | 모든 AI 랜딩페이지에 있는 장식 |
| 헤어라인 구분선 과다 사용 | 섹션마다 `<hr>` 넣는 것은 디자인 포기 |

---

## 색상

### 배경
| 용도 | 클래스 | 값 |
|------|--------|-----|
| 페이지 배경 | `bg-slate-50` | #f8fafc |
| 카드·패널 | `bg-white` | #ffffff |
| 중첩 배경 | `bg-slate-100` | #f1f5f9 |

### 텍스트
| 용도 | 클래스 | 값 |
|------|--------|-----|
| 주 텍스트 (제목) | `text-slate-900` | #0f172a |
| 본문 | `text-slate-700` | #334155 |
| 보조 설명 | `text-slate-500` | #64748b |
| 비활성·플레이스홀더 | `text-slate-400` | #94a3b8 |

### 브랜드·시맨틱
| 용도 | 클래스 | 값 |
|------|--------|-----|
| 주요 액션 (버튼, 링크) | `text-blue-600` / `bg-blue-600` | #2563eb |
| 호버 | `bg-blue-700` | #1d4ed8 |
| 성공·합격 | `text-green-600` | #16a34a |
| 에러·불합격 | `text-red-500` | #ef4444 |
| 경고·대기 | `text-amber-500` | #f59e0b |
| 정보 | `text-blue-500` | #3b82f6 |

### 테두리
| 용도 | 클래스 | 값 |
|------|--------|-----|
| 기본 테두리 | `border-slate-200` | #e2e8f0 |
| 강조 테두리 | `border-slate-300` | #cbd5e1 |
| 포커스 링 | `ring-blue-500` | #3b82f6 |

---

## 컴포넌트

### 카드
```
bg-white rounded-lg border border-slate-200 p-6 shadow-sm
```
- 그림자는 `shadow-sm`까지만. `shadow-lg` 금지.
- 호버 상태: `hover:border-slate-300 hover:shadow-md transition-shadow`

### 버튼
```
Primary:   rounded-md bg-blue-600 text-white text-sm font-medium px-4 py-2 hover:bg-blue-700 transition-colors
Secondary: rounded-md bg-slate-100 text-slate-700 text-sm font-medium px-4 py-2 hover:bg-slate-200 transition-colors
Ghost:     text-slate-500 text-sm hover:text-slate-700 transition-colors
Danger:    rounded-md bg-red-50 text-red-600 text-sm font-medium px-4 py-2 hover:bg-red-100 transition-colors
```

### 입력 필드
```
rounded-md bg-white border border-slate-300 px-3 py-2 text-sm text-slate-900
placeholder:text-slate-400
focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
```

### 텍스트 에어리어 (자소서 편집기)
```
rounded-md bg-white border border-slate-300 px-4 py-3 text-sm text-slate-900
leading-relaxed resize-none
focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
```

### 배지 (태그, 상태)
```
상태 배지: rounded-full text-xs font-medium px-2.5 py-0.5
  - 진행중: bg-blue-50 text-blue-700
  - 완료:   bg-green-50 text-green-700
  - 불합격: bg-red-50 text-red-600
  - 초안:   bg-slate-100 text-slate-600

역량 태그: rounded-md bg-slate-100 text-slate-600 text-xs px-2 py-1
```

### 사이드바 네비게이션
```
메뉴 아이템:
  기본:    flex items-center gap-3 px-3 py-2 rounded-md text-sm text-slate-600 hover:bg-slate-100
  활성:    flex items-center gap-3 px-3 py-2 rounded-md text-sm text-slate-900 bg-slate-100 font-medium
```

---

## 레이아웃

- **최대 너비**: `max-w-5xl` (컨텐츠 영역), `max-w-3xl` (글쓰기 집중 영역)
- **사이드바**: 너비 240px 고정, 좌측 고정
- **메인 콘텐츠**: 사이드바 제외 나머지 전체
- **정렬**: 좌측 정렬 기본. 중앙 정렬은 빈 상태(empty state) 일러스트에만
- **컨테이너 패딩**: `px-6 py-6`
- **섹션 간 간격**: `space-y-6` (일반), `space-y-8` (큰 섹션)
- **카드 내부 간격**: `gap-4` (항목), `gap-6` (섹션)

---

## 타이포그래피

| 용도 | 클래스 |
|------|--------|
| 페이지 제목 | `text-2xl font-semibold text-slate-900` |
| 섹션 제목 | `text-lg font-semibold text-slate-900` |
| 카드 레이블 | `text-xs font-medium text-slate-500 uppercase tracking-wide` |
| 본문 | `text-sm text-slate-700 leading-relaxed` |
| 자소서 본문 | `text-base text-slate-800 leading-loose` |
| 캡션·도움말 | `text-xs text-slate-400` |

---

## 애니메이션

허용:
- `transition-colors duration-150` — 버튼·링크 색상 전환
- `transition-shadow duration-150` — 카드 그림자
- `fade-in` (opacity 0→1, 0.2s) — 모달·드롭다운 등장

금지:
- 스크롤 트리거 애니메이션
- 무한 루프 애니메이션
- `transform: scale` 호버 효과
- 글로우·블러 펄스

---

## 아이콘

- **라이브러리**: Lucide React (`lucide-react`)
- **기본 크기**: `w-4 h-4` (인라인), `w-5 h-5` (버튼 옆), `w-6 h-6` (강조)
- **stroke-width**: 기본 2 (변경 금지)
- **아이콘 컨테이너**: 둥근 배경 박스로 감싸지 마라. 아이콘은 텍스트와 나란히 인라인으로.
- **색상**: 부모 텍스트 색상을 따른다 (`currentColor`)

---

## AI 스트리밍 UI

- 스트리밍 중 로딩 인디케이터: 텍스트 커서 블링크 (`|` 애니메이션)
- 생성 중 버튼 상태: disabled + "생성 중..." 텍스트
- 에러 시: `text-red-500` 인라인 메시지 (토스트 금지 — 글쓰기 컨텍스트 방해)
- 완료 시: 조용히 완료. 성공 토스트 없음 — 사용자가 결과를 바로 봄
