-- 헤아림 — 리포트 보관 테이블 (2026-08-27 추가)
-- Supabase → SQL Editor 에 붙여넣고 Run 하세요. 기존 테이블은 건드리지 않습니다.
--
-- 왜 필요한가
--   판매 단위가 "리포트 1건"이 된 뒤, /pricing·/refund·토스 회신에 "구매한 리포트는 계정에
--   저장되어 다시 열람할 수 있다"고 명시했다. 그런데 실제 AI 풀이 원문은 브라우저
--   localStorage 와 Redis 캐시(TTL 60일)에만 있었다. 기기를 바꾸거나 캐시가 만료되면
--   같은 리포트가 아니라 "새로 생성된 다른 글"이 나온다. 그래서 원문을 계정에 영구 보관한다.
--
-- 설계 메모
--   - user_id 에 FK 를 걸지 않는다. 보관은 best-effort 이고, 유저 행 생성 타이밍 때문에
--     리포트를 잃는 쪽이 더 나쁘다.
--   - id 는 결정론적으로 만든다 → 같은 리포트를 다시 열어도 행이 늘지 않고 갱신된다.
--     형식: "<uid>|<kind>|<chart>|<variant>"
--   - body 는 AI 원문 그대로(@@key@@ 마커 포함). 파싱은 클라이언트가 한다.

create table if not exists saju_reports (
  id          text primary key,          -- "<uid>|<kind>|<chart>|<variant>"
  user_id     text not null,
  kind        text not null,             -- 'reading' | 'yearly' | 'gunghap'
  chart       text not null,             -- 명식 id 16 hex (궁합은 pairId)
  variant     text not null default '',  -- reading=말투, yearly=연도, gunghap='v1'
  title       text,                      -- 목록 표시용
  meta        jsonb,                     -- { name, birth, ilju, motif, emoji, year, ... }
  body        text not null,             -- AI 원문
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_saju_reports_user on saju_reports(user_id, updated_at desc);
create index if not exists idx_saju_reports_lookup on saju_reports(user_id, kind, chart);

-- RLS: 다른 테이블과 동일하게 잠금(정책 없음) → service_role 키를 쓰는 서버 라우트만 접근.
alter table saju_reports enable row level security;
