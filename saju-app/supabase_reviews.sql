-- 헤아림 — 실후기 수집 테이블 (2026-09-02 추가)
-- Supabase → SQL Editor 에 붙여넣고 Run 하세요. 기존 테이블은 건드리지 않습니다.
--
-- 왜 필요한가
--   "가짜 후기는 쓰지 않는다"가 브랜드 원칙(헤아림_진솔톤_가이드.md)이다. 그러면 마케팅에
--   쓸 후기는 실제 사용자에게서 받아야 하는데, 지금까지 후기를 받을 통로가 아예 없었다.
--   풀이를 끝까지 본 사람에게 한 줄을 받아 쌓고, 사장님이 승인한 것만 사이트에 노출한다.
--
-- 설계 메모
--   - 로그인 없이도 남길 수 있다(수집량 우선). 대신 명식 1건 + 같은 작성자당 1행으로 묶어
--     id 를 결정론적으로 만든다 → 다시 내면 행이 늘지 않고 갱신된다.
--       형식: "<chart>|<who>"   who = 로그인 uid 또는 "ip:<해시8>"
--   - 원문 IP 는 저장하지 않는다. AUTH_SECRET 을 소금으로 쓴 해시 앞 16자만 남긴다
--     (중복 방지·스팸 추적용. 개인정보 최소 수집).
--   - status 기본값은 'pending' — 승인 전에는 어디에도 노출되지 않는다.
--   - consent = 인스타·랜딩 등 외부 인용 동의 여부. 동의 없으면 사이트 안에서만 쓴다.

create table if not exists saju_reviews (
  id          text primary key,                 -- "<chart>|<who>"
  chart       text not null,                    -- 명식 id 16 hex
  user_id     text,                             -- 로그인했을 때만
  rating      int  not null,                    -- 1~5
  body        text not null,                    -- 한 줄 후기
  nickname    text,                             -- 표시용(선택). 비면 '익명'
  tier        text not null default 'free',     -- 'free' | 'premium'
  engine      int,                              -- 작성 당시 ENGINE_VERSION
  consent     boolean not null default false,   -- 외부(인스타 등) 인용 동의
  status      text not null default 'pending',  -- 'pending' | 'public' | 'hidden'
  ip_hash     text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_saju_reviews_public on saju_reviews(status, created_at desc);
create index if not exists idx_saju_reviews_recent on saju_reviews(created_at desc);

-- RLS: 다른 테이블과 동일하게 잠금(정책 없음) → service_role 키를 쓰는 서버 라우트만 접근.
alter table saju_reviews enable row level security;
