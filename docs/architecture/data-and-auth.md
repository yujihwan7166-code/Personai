# 데이터·인증 설계 (v1, 2026-04-26)

> 노트 컬럼 8개(오늘·캘린더·할일·습관·마이위키·포모도로·데일리브리핑·일기) 실제 구현 직전,
> "어디에 저장하고, 어떻게 동기화하고, 누가 인증하는가" 를 합의하기 위한 단일 진실 문서.
> 결정 사항은 이 문서를 통해 합의되며, 실제 코드 변경은 별도 PR 로 진행.

---

## 1. 결정 요약 (TL;DR)

| 영역 | 결정 |
|---|---|
| **인증** | `@supabase/supabase-js` 단일 사용. `@lovable.dev/cloud-auth-js` 는 단계적 제거 |
| **저장소** | **비로그인 = IndexedDB only**, **로그인 = IDB + Supabase 양방향 동기화** |
| **스키마** | 노트 8개 도구는 **3개 테이블 + 메타** 로 정규화 (notes/tasks/events + tool_meta) |
| **마이그레이션** | localStorage(study_*) 데이터는 사용자 트리거 마이그레이션. 자동 X |
| **충돌 정책** | last-write-wins, `updated_at` 기준. 클라가 권위 (offline-first) |
| **민감도** | 콘텐츠는 **암호화 저장 X** (v1). E2EE 는 v2+ 검토 |

---

## 2. 인증 결정

### 현 상태
- `package.json` 에 둘 다 의존성 있음
  - `@supabase/supabase-js@2.98.0`
  - `@lovable.dev/cloud-auth-js@0.0.3`
- `src/integrations/supabase/client.ts` + `src/integrations/lovable/index.ts` 둘 다 존재
- `Auth.tsx` 가 두 SDK 모두 사용 중

### 결정: Supabase 단일화

**이유**:
- Supabase 가 OSS·문서·생태계 모두 우월
- 노트 데이터 동기화·RLS·Realtime 까지 한 벤더에서 해결 (Lovable 은 인증만)
- Lovable 은 v0.0.3 — 메이저 안정성 미보장

**전환 단계**:
1. (지금) Supabase 인증으로 신규 가입·로그인 통일
2. (다음 PR) `Auth.tsx` 에서 Lovable OAuth 호출 제거, Supabase OAuth 로 교체
3. (그 다음) `@lovable.dev/cloud-auth-js` 의존성 제거
4. 기존 Lovable 토큰 보유 사용자는 자연 만료 후 재로그인 안내

---

## 3. 저장소 결정 (가장 중요)

### 원칙: **Offline-First + 옵셔널 클라우드 동기화**

```
       ┌─────────────────────────────────────┐
       │         사용자 디바이스               │
       │  ┌──────────────┐                   │
       │  │  IndexedDB   │  ← 항상 진실의 원천 │
       │  └──────┬───────┘                   │
       └─────────┼───────────────────────────┘
                 │ (로그인 + 동기화 활성 시)
                 ▼
       ┌─────────────────────────────────────┐
       │       Supabase (선택)                │
       │  ┌──────────────┐                   │
       │  │  Postgres    │  ← 백업·교차기기    │
       │  └──────────────┘                   │
       └─────────────────────────────────────┘
```

**Why offline-first**:
- 모바일·약한 네트워크에서도 동작
- 로그인 안 해도 즉시 사용 가능 (전환 마찰 ↓)
- 클라우드는 보너스, 필수 X

**Why Supabase**:
- Postgres + Row-Level Security
- Realtime 채널로 동기화 가능 (선택)
- 무료 티어 시작 가능

### 비로그인 사용자
- IndexedDB 만 사용 (현재 [studyBlobStore.ts](src/lib/studyBlobStore.ts) 패턴 확장)
- 사용자가 로그인하면 → 기존 IDB 데이터를 첫 동기화 시 Supabase 에 업로드 옵션 제시

### 로그인 사용자
- 모든 쓰기는 IDB 에 즉시 → 백그라운드로 Supabase 에 push
- 모든 읽기는 IDB 에서 (네트워크 X)
- 다른 기기에서 변경된 게 있으면 pull 후 IDB 갱신

---

## 4. 스키마 (노트 8개 통합)

### 핵심 통찰
8개 도구는 **자료형 3개**로 정규화 가능:
- 시간 단위 = `events` (캘린더 일정)
- 할 일 = `tasks` (체크리스트, 마감)
- 자유 텍스트 = `notes` (메모·일기·마이위키)

**도구별 매핑**:
| UI 도구 | 저장 테이블 | 구분 방법 |
|---|---|---|
| 📅 캘린더 | `events` | — |
| ✅ 할 일 | `tasks` | — |
| 🌱 습관 | `tasks` | `kind = 'habit'`, `recurrence != null` |
| ☀️ 오늘 | (집계 뷰) | events + tasks where date = today |
| 📖 일기 | `notes` | `kind = 'journal'` |
| 🌐 마이위키 | `notes` | `kind = 'wiki'`, `links: text[]` |
| 🍅 포모도로 | `events` | `kind = 'focus_session'` (자동 생성) |
| ☕ 데일리 브리핑 | (런타임 생성) | LLM 호출 결과, 캐시 24h |

### Postgres DDL (Supabase)

```sql
-- 사용자별 RLS 활성, 본인 row 만 접근

create table notes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  kind        text not null check (kind in ('memo', 'journal', 'wiki')),
  title       text,
  body        text not null default '',
  tags        text[] not null default '{}',
  links       text[] not null default '{}',  -- 마이위키 [[링크]] 대상
  pinned      boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index idx_notes_user_kind on notes(user_id, kind);
create index idx_notes_user_updated on notes(user_id, updated_at desc);

create table tasks (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  kind          text not null check (kind in ('todo', 'habit')),
  title         text not null,
  done          boolean not null default false,
  due_at        timestamptz,
  recurrence    text,                         -- RRULE-lite, habit 만 사용
  habit_streak  int not null default 0,
  note_ref      uuid references notes(id),    -- 메모에서 변환된 경우
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index idx_tasks_user_kind on tasks(user_id, kind);
create index idx_tasks_user_due on tasks(user_id, due_at);

create table events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  kind        text not null default 'event' check (kind in ('event', 'focus_session')),
  title       text not null,
  start_at    timestamptz not null,
  end_at      timestamptz,
  all_day     boolean not null default false,
  task_ref    uuid references tasks(id),     -- 할 일에서 캘린더로 드래그한 경우
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index idx_events_user_start on events(user_id, start_at);

-- RLS
alter table notes enable row level security;
alter table tasks enable row level security;
alter table events enable row level security;

create policy "own rows only" on notes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows only" on tasks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows only" on events
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

### IndexedDB 스키마 (브라우저)
- DB 이름: `expert-chat-forum-v1`
- ObjectStores: `notes`, `tasks`, `events` (위 Postgres 테이블과 1:1)
- 인덱스: `user_kind`, `user_updated`, `user_due`, `user_start`
- 각 row 에 `_synced_at` (마지막 서버 동기화 시각), `_dirty` (서버 푸시 대기) 메타 추가

---

## 5. 동기화·충돌 정책

### 동기화 트리거
1. 앱 시작 시 1회 풀 동기화
2. 쓰기 직후 1초 디바운스로 push
3. 30초마다 background pull (변경 있으면)
4. (선택) Supabase Realtime 채널 — v2+

### 충돌 해결
- **last-write-wins** (`updated_at` 큰 쪽 채택)
- 단, 양쪽 모두 dirty 면 클라가 권위 (사용자가 방금 적은 쪽 우선)
- 삭제는 tombstone 으로 처리 (`deleted_at` 컬럼 추가 검토 — v1.1)

### 마이그레이션 (기존 localStorage)
- [study_notebooks_v1](src/hooks/usePersistedStudyNotebooks.ts) 등 LS 데이터는 **자동 마이그레이션 X**
- 사용자가 `/settings → 데이터 가져오기` 클릭 시 IDB 로 1회 옮기기
- 마이그레이션 후 LS 데이터는 30일 보관 후 정리

---

## 6. 보안·민감도

### v1 (현재)
- 콘텐츠는 **평문** (Supabase 측 at-rest 암호화에 의존)
- 비밀번호는 Supabase Auth 가 처리 (bcrypt)
- API 키는 환경변수 분리 — 클라에 노출 X

### v2+ 검토 항목
- 일기·마이위키는 민감 콘텐츠 → 클라이언트측 E2EE 옵션
- 키 관리: 비밀번호 derived key 또는 별도 passphrase

---

## 7. 미결 (사용자 결정 필요)

다음 항목은 코드 작성 전 사용자 합의 필요:

1. **Supabase 프로젝트** — 새 프로젝트 만들지, 기존 활용할지
2. **무료 티어 한도 모니터링** — 어떤 알림 채널?
3. **로그인 강제 시점** — 8개 도구 중 어디부터 로그인 필요로 할지 (제안: 마이위키·동기화는 필요, 나머지는 선택)
4. **데이터 export 형식** — JSON vs Markdown vs Both
5. **삭제 정책** — 회원 탈퇴 시 즉시 vs 30일 grace

---

## 8. 단계별 구현 순서 (참고)

```
Step 1 (1주): Supabase 프로젝트 + 위 DDL 적용 + RLS 검증
Step 2 (1주): IDB 추상 레이어 (notes/tasks/events 추상 store) + 마이그레이션 유틸
Step 3 (1~2주): 동기화 엔진 (push + pull, dirty 추적)
Step 4 (이후): 노트 8개 도구별 UI 구현 — 위 스키마 그대로 사용
```

이 순서가 무너지면(예: UI 부터 만들면) 나중에 데이터 모델 재작업 비용 폭증.
