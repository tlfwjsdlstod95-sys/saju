// 무료 · 정밀 리포트 차이표 (§E-4 ④)
//
// 왜 표인가: 유료 목차(6줄 리스트)는 있었는데 「무료로 어디까지 보이나」가 한 자리에 없었다.
// 나란히 두면 파는 것이 **문장 길이가 아니라 판정**이라는 게 한눈에 보인다.
//
// ⚠️ 이 표는 약속이다 — 칸 하나하나가 실제 게이팅과 맞아야 한다(gate.ts · /api/premium · /api/reading · /api/chat).
//    기능 잠금을 바꾸면 이 표도 같이 고친다. 검사: scripts/test-plancompare.ts
// ⚠️ 가격은 여기 적지 않는다 — Paywall.tsx PRICE 한 곳에서만 관리(가격 인상 때 두 곳을 고치다 어긋난다).
//
// 가독성: 묶음 4개 · 묶음당 3줄 이하 · 칸 안은 6자 안팎 · 같은 칸은 ✓ 로만(말을 반복하지 않는다).

export type Cell = true | false | string;
export interface CompareRow { label: string; free: Cell; paid: Cell }
export interface CompareGroup { title: string; rows: CompareRow[] }

export const COMPARE: CompareGroup[] = [
  {
    title: '계산',
    rows: [
      { label: '네 기둥 · 진태양시 보정', free: true, paid: true },
      { label: '경계 진단 (어디서 갈리나)', free: true, paid: true },
      { label: '오행 · 강약 · 대운 곡선', free: true, paid: true },
    ],
  },
  {
    title: '판정',
    rows: [
      { label: '용신', free: '후보·갈림만', paid: '확정 + 근거' },
      { label: '격국', free: '후보만', paid: '확정 + 이유' },
      { label: '12신살', free: '이름·자리', paid: '+ 길흉 반전' },
    ],
  },
  {
    title: '풀이',
    rows: [
      { label: '사주 풀이', free: '기본 풀이', paid: 'AI 심층 10주제' },
      { label: '1:1 질문', free: '3번', paid: '이어서 계속' },
    ],
  },
  {
    title: '쓰는 도구',
    rows: [
      { label: '신년운세 월별 · 택일 · 개운법', free: false, paid: true },
      { label: '리포트함 보관 · PDF 가이드북', free: false, paid: true },
    ],
  },
];

function C({ v, paid }: { v: Cell; paid?: boolean }) {
  if (v === true) return <span className={`pc-yes${paid ? ' paid' : ''}`}>✓</span>;
  if (v === false) return <span className="pc-no">—</span>;
  return <span className={`pc-txt${paid ? ' paid' : ''}`}>{v}</span>;
}

export default function PlanCompare() {
  return (
    <div className="pc" role="table" aria-label="무료와 정밀 리포트 비교">
      <div className="pc-head" role="row">
        <span role="columnheader" />
        <span role="columnheader">무료</span>
        <span role="columnheader" className="paid">정밀 리포트</span>
      </div>
      {COMPARE.map((g) => (
        <div className="pc-group" key={g.title} role="rowgroup">
          <div className="pc-gt">{g.title}</div>
          {g.rows.map((r) => (
            <div className="pc-row" role="row" key={r.label}>
              <span role="rowheader">{r.label}</span>
              <span role="cell"><C v={r.free} /></span>
              <span role="cell"><C v={r.paid} paid /></span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
