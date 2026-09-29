// 정밀 리포트 샘플 1쪽 (§E-4 ④ 후속) — 「돈 내면 무엇이 나오나」를 실물로 보여준다.
//
// 샘플 명식은 지어내지 않는다. 『적천수천미』 원전에 실린 명식 하나(JCS-044)를
// **지금 배포된 엔진으로 빌드 때 다시 판정**해서 그대로 찍는다. 엔진이 바뀌면 샘플도 바뀐다.
//   · 가상 인물의 AI 풀이를 샘플로 쓰지 않는다 — 누구의 것도 아닌 글은 「지어낸 결과」다.
//   · 이 명식은 개발 세트(seenBy v7)다. 맞힌 걸 자랑하지 않고 **그 사실을 화면에 적는다.**
//   · 원문 번역은 헤아림이 풀어 옮긴 것이라고 밝힌다.
// 판정 코드는 서버에서만 돈다(이 페이지는 서버 컴포넌트 · 골든 JSON 이 클라이언트 번들에 안 들어간다).
import { pageMeta } from '@/lib/pageMeta';
import Link from 'next/link';
import type { Metadata } from 'next';
import goldenRaw from '@/scripts/golden-cases.json';
import { chartFromGanji } from '@/lib/saju/fromGanji';
import { dayMasterStrength } from '@/lib/saju/elements';
import { computeGyeokYong } from '@/lib/saju/gyeokyong';
import { ENGINE_VERSION } from '@/lib/saju/version';
import { READING_KEYS, READING_ICONS, READING_LABELS } from '@/lib/saju/readingMeta';

export const metadata: Metadata = pageMeta({
  title: '정밀 리포트 샘플 — 용신 판정 1쪽 | 헤아림',
  description: '『적천수천미』 원전 명식으로 뽑은 헤아림 정밀 리포트의 실제 1쪽. 다섯 가지 법 중 어느 기준을 왜 채택했는지, 원전은 뭐라고 했는지 그대로 보여드립니다.',
  path: '/sample',
});

const SAMPLE_ID = 'JCS-044';
// 원문 풀어 옮김(헤아림). 원문은 케이스 note 에 있다.
const GLOSS =
  '흔한 방식으로 보면 「겨울 쇠는 불을 반긴다」고 여기고, 천간에 丙 둘이 떠 있으니 칠살 하나가 맑게 남았다고 본다. … ' +
  '땅속에 젖은 흙이 겹겹이라 쇠를 살려 낼 뜻이 없음을 모르는 것이다. 물을 쓸 수 있을 뿐, 불은 쓸 수 없다.';

type Raw = { id: string; pillars: { year: string; month: string; day: string; hour?: string }; expect: { yongsin: string }; source: { chapter?: string; page?: string }; note?: string; seenBy?: string };

function load() {
  const c = (goldenRaw as { cases: Raw[] }).cases.find((x) => x.id === SAMPLE_ID)!;
  const { dayGan, pillars } = chartFromGanji(c.pillars);
  const strength = dayMasterStrength(dayGan, pillars);
  const gy = computeGyeokYong(pillars, dayGan, strength);
  const quote = (c.note ?? '').replace(/^원문:\s*/, '').split(' — ')[0];
  return { c, gy, strength, quote };
}

// 용어 한 줄 풀이 — 본문은 그대로 두고 옆에만 붙인다(사전처럼 쌓지 않는다).
const GYEOK_PLAIN: Record<string, string> = {
  정관격: '규칙과 책임감이 중심인 그릇',
  편관격: '압박을 견디며 밀고 나가는 힘이 중심인 그릇',
  칠살격: '압박을 견디며 밀고 나가는 힘이 중심인 그릇',
  정재격: '차곡차곡 모으고 지키는 힘이 중심인 그릇',
  편재격: '기회를 넓게 잡는 힘이 중심인 그릇',
  식신격: '꾸준히 만들어 내는 재주가 중심인 그릇',
  상관격: '재주를 드러내고 틀을 깨는 힘이 중심인 그릇',
  정인격: '배우고 도움받는 힘이 중심인 그릇',
  편인격: '남다른 감각과 직관이 중심인 그릇',
  건록격: '스스로 서는 힘이 중심인 그릇',
  양인격: '밀어붙이는 힘이 아주 센 그릇',
};
const MIDAL_PLAIN = '자격 미달 — 필요한 기운이긴 하지만, 명식 안에 받쳐 줄 뿌리가 없어 실제로는 쓸 수 없다는 뜻이에요.';

const PILLAR_ORDER = [['hour', '시'], ['day', '일'], ['month', '월'], ['year', '년']] as const;

export default function SamplePage() {
  const { c, gy, strength, quote } = load();
  const y = gy.yongsin;
  const hit = y.primary === c.expect.yongsin;
  const tier = strength <= 0.38 ? '신약' : strength >= 0.55 ? '신강' : '중화';

  return (
    <main className="wrap sp">
      <Link href="/" className="sp-back">← 헤아림</Link>

      <header className="sp-hero">
        <div className="sp-kicker">정밀 리포트 샘플</div>
        <h1>리포트 1쪽 — <span>용신 판정</span></h1>
        <p>돈을 내면 무엇이 나오는지, 실물 한 쪽을 그대로 보여드려요.</p>
      </header>

      <div className="sp-note">
        <b>샘플 명식은 지어내지 않았어요.</b> 『적천수천미』 {c.source.chapter} {c.source.page}에 실린 옛 명식입니다.
        생년월일은 전해지지 않고 네 기둥만 남아 있어, 네 기둥에서 바로 계산했어요.
      </div>

      <dl className="sp-terms">
        <div><dt>명식</dt><dd>태어난 해·달·날·시를 네 기둥, 여덟 글자로 적은 표예요.</dd></div>
        <div><dt>용신</dt><dd>이 명식에 가장 필요한 기운이에요. 약처럼 채워 쓰는 오행이라고 보시면 돼요.</dd></div>
      </dl>

      {/* ── 1. 명식 ── */}
      <section className="sp-sec">
        <h2><em>1</em> 명식</h2>
        <div className="sp-pillars">
          {PILLAR_ORDER.map(([k, label]) => (
            <div key={k}><span>{label}</span><b>{c.pillars[k] ?? '—'}</b></div>
          ))}
        </div>
        <p className="sp-small">일간 庚(금) · {tier} {Math.round(strength * 100)}% · 조후 {gy.johu.climate}</p>
      </section>

      {/* ── 2. 판정 ── */}
      <section className="sp-sec">
        <h2><em>2</em> 판정</h2>
        <div className="sp-verdict">
          <div><span>그릇(격국)</span><b>{gy.gyeokguk.name}</b></div>
          <div className="on"><span>용신</span><b>{y.primary}</b></div>
          <div><span>채택한 법</span><b>{y.method}</b></div>
        </div>
        <p className="sp-term-line"><b>{gy.gyeokguk.name}</b> — {GYEOK_PLAIN[gy.gyeokguk.name] ?? '태어난 달이 정해 주는 이 명식의 기본 그릇'}이에요.</p>

        <h3 className="sp-h3">기준마다 답이 달랐어요</h3>
        <div className="sp-bases">
          {y.bases.map((b) => (
            <div className={`sp-base${b.adopted ? ' on' : ''}`} key={b.method}>
              <div className="sp-base-h">
                <b>{b.method}</b><span>{b.value ?? '—'}</span>
                <i>{b.adopted ? '채택' : '기각'}</i>
              </div>
              <p>{b.note}</p>
              {b.note?.includes('자격 미달') && <p className="sp-term-line">{MIDAL_PLAIN}</p>}
            </div>
          ))}
        </div>

        {y.decisive && (
          <div className="sp-decisive"><b>무엇이 갈랐나</b>{y.decisive}</div>
        )}
      </section>

      {/* ── 3. 원전 대조 ── */}
      <section className="sp-sec">
        <h2><em>3</em> 원전은 뭐라고 했나</h2>
        <blockquote className="sp-quote">
          <p className="sp-han">{quote}</p>
          <p className="sp-gloss">{GLOSS}<small> — 헤아림 풀어 옮김</small></p>
        </blockquote>
        <div className="sp-match">
          <div><span>원전의 답</span><b>{c.expect.yongsin}</b></div>
          <div><span>헤아림 판정</span><b>{y.primary}</b></div>
          <div className={hit ? 'ok' : 'no'}><span>결과</span><b>{hit ? '같음' : '다름'}</b></div>
        </div>
        <p className="sp-honest">
          ⚠️ 이 명식은 엔진 규칙을 다듬을 때 <b>이미 본 명식</b>이에요(개발 세트). 그래서 맞힌 것 자체는 실력 증명이 아닙니다.
          {' '}처음 보는 명식에서 얼마나 맞히는지는 <Link href="/accuracy">검증 페이지</Link>에 따로 공개해 두었어요.
        </p>
      </section>

      {/* ── 4. 풀이 ── */}
      <section className="sp-sec">
        <h2><em>4</em> 풀이</h2>
        <p className="sp-body">{y.desc}</p>
        <p className="sp-body">{gy.gyeokguk.desc}</p>
      </section>

      {/* ── 전체 구성 — 장(章) 카드 ── */}
      <section className="sp-sec">
        <h2 className="sp-toc-h">전체 리포트는 이렇게 이어져요</h2>
        <div className="sp-part">
          <div className="sp-part-h"><em>PART 1</em> 판정 <span>지금 보신 쪽</span></div>
          <div className="sp-keys">
            <div className="now"><b>🎯</b>용신 확정</div>
            <div><b>🏛</b>격국 확정</div>
            <div><b>🔄</b>12신살 길흉 반전</div>
          </div>
        </div>
        <div className="sp-part">
          <div className="sp-part-h"><em>PART 2</em> AI 심층 풀이 <span>{READING_KEYS.length}주제 · 말투 3종</span></div>
          <div className="sp-keys">
            {READING_KEYS.map((k) => (<div key={k}><b>{READING_ICONS[k]}</b>{READING_LABELS[k]}</div>))}
          </div>
        </div>
        <div className="sp-part">
          <div className="sp-part-h"><em>PART 3</em> 쓰는 도구</div>
          <div className="sp-keys">
            <div><b>🗓</b>신년운세 월별</div>
            <div><b>📅</b>결혼·이직·이사 택일</div>
            <div><b>🍀</b>개운법</div>
            <div><b>📕</b>PDF 가이드북</div>
          </div>
        </div>
        <p className="sp-small">PART 2 풀이는 명식마다 새로 쓰기 때문에 샘플로 싣지 않았어요 — 남의 풀이를 보여드리면 그건 지어낸 결과가 되니까요.</p>
      </section>

      <div className="sp-cta">
        <Link href="/" className="btn">내 명식으로 보기 →</Link>
        <p>판정 엔진 v{ENGINE_VERSION} · 이 쪽은 빌드할 때 엔진이 다시 계산한 결과예요.</p>
      </div>
    </main>
  );
}
