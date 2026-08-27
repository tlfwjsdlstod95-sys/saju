'use client';

// 내 리포트함 — 구매(또는 무료 제공)해서 실제로 받아본 AI 리포트의 원문 보관소.
//
// 왜 있나: 판매 단위가 "리포트 1건"이라 약관·결제 안내에 "구매한 리포트는 계정에 저장되어
// 다시 열람할 수 있다"고 적어 뒀다. 원문이 브라우저에만 있으면 기기를 바꿨을 때 같은 글이
// 안 나오므로 그 약속이 성립하지 않는다. 여기가 그 약속의 실체다.
//
// 저장은 서버(AI 라우트)가 직접 한다. 이 컴포넌트는 읽기·삭제만 한다.

import { useCallback, useEffect, useState } from 'react';
import {
  cloudListReports, cloudGetReport, cloudDeleteReport,
  type CloudReportSummary, type CloudReportKind,
} from '@/lib/cloud';
import {
  parseReadingStream,
  READING_KEYS, READING_ICONS, READING_LABELS,
  GUNGHAP_KEYS, GUNGHAP_ICONS, GUNGHAP_LABELS,
  type ReadingSection,
} from '@/lib/saju/readingMeta';

const KIND_TAG: Record<CloudReportKind, string> = {
  reading: '정밀 리포트',
  yearly: '신년운세',
  gunghap: '궁합',
};

function fmtDate(ms: number): string {
  try {
    const d = new Date(ms);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  } catch { return ''; }
}

function parseBody(kind: CloudReportKind, body: string): { lead: string; sections: ReadingSection[]; plain: string } {
  if (kind === 'gunghap') {
    const p = parseReadingStream(body, GUNGHAP_KEYS, GUNGHAP_ICONS, GUNGHAP_LABELS);
    return { ...p, plain: p.sections.length ? '' : body };
  }
  if (kind === 'reading') {
    const p = parseReadingStream(body, READING_KEYS, READING_ICONS, READING_LABELS);
    return { ...p, plain: p.sections.length ? '' : body };
  }
  // 신년운세 총평은 마커 없는 산문
  return { lead: '', sections: [], plain: body };
}

export default function ReportShelf() {
  const [items, setItems] = useState<CloudReportSummary[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [bodies, setBodies] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const reload = useCallback(() => { cloudListReports().then(setItems).catch(() => {}); }, []);

  useEffect(() => {
    reload();
    // 로그인 직후 동기화가 끝나면 다시 불러온다 (AccountSync 가 쏘는 이벤트)
    window.addEventListener('saju:synced', reload);
    return () => window.removeEventListener('saju:synced', reload);
  }, [reload]);

  async function toggle(it: CloudReportSummary) {
    setConfirmId(null);
    if (openId === it.id) { setOpenId(null); return; }
    setOpenId(it.id);
    if (bodies[it.id]) return;
    setBusy(it.id);
    const body = await cloudGetReport(it.kind, it.chart, it.variant);
    setBodies((m) => ({ ...m, [it.id]: body ?? '' }));
    setBusy(null);
  }

  async function remove(id: string) {
    setConfirmId(null);
    setItems((list) => list.filter((x) => x.id !== id));
    if (openId === id) setOpenId(null);
    await cloudDeleteReport(id);
  }

  // 받아본 리포트가 없으면 화면을 어지럽히지 않는다.
  if (!items.length) return null;

  return (
    <div className="card">
      <h2>📜 내 리포트함<span className="shelf-count">{items.length}</span></h2>
      <div className="meta" style={{ marginBottom: 14 }}>
        받아보신 리포트의 <b style={{ color: 'var(--gold)' }}>원문 그대로</b> 계정에 보관돼요. 다른 기기에서 로그인해도 같은 글이 열립니다.
      </div>

      <div className="report-list">
        {items.map((it) => {
          const open = openId === it.id;
          const raw = bodies[it.id];
          const parsed = open && raw ? parseBody(it.kind, raw) : null;
          return (
            <div className={`report-item${open ? ' open' : ''}`} key={it.id}>
              <div className="report-head" onClick={() => toggle(it)} role="button" tabIndex={0}
                   onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggle(it); }}>
                <span className="report-emoji">{it.meta?.emoji ?? (it.kind === 'gunghap' ? '💞' : it.kind === 'yearly' ? '🌗' : '📜')}</span>
                <span className="report-info">
                  <b>{it.title}</b>
                  <small>
                    <span className="report-tag">{KIND_TAG[it.kind]}</span>
                    {it.meta?.birth ? ` ${it.meta.birth}` : ''}
                    {it.meta?.ilju ? ` · ${it.meta.ilju}` : ''}
                    {` · ${fmtDate(it.updatedAt)}`}
                  </small>
                </span>
                <span className="report-caret">{open ? '▲' : '▼'}</span>
              </div>

              {open && (
                <div className="report-body">
                  {busy === it.id && <p className="meta">불러오는 중…</p>}
                  {busy !== it.id && !raw && <p className="meta">원문을 찾지 못했어요. 위에서 다시 열어보시면 새로 보관됩니다.</p>}
                  {parsed && (
                    <>
                      {parsed.lead && <p className="report-lead">{parsed.lead}</p>}
                      {parsed.sections.map((s) => (
                        <div className="report-sec" key={s.key}>
                          <h4>{s.icon} {s.title || s.label}</h4>
                          {s.body.split('\n').filter(Boolean).map((line, i) => <p key={i}>{line}</p>)}
                        </div>
                      ))}
                      {parsed.plain && parsed.plain.split('\n').filter(Boolean).map((line, i) => <p key={i}>{line}</p>)}
                    </>
                  )}
                  <div className="report-actions">
                    {confirmId === it.id ? (
                      <>
                        <button className="mini-btn danger" onClick={() => remove(it.id)}>정말 삭제할게요</button>
                        <button className="mini-btn" onClick={() => setConfirmId(null)}>취소</button>
                      </>
                    ) : (
                      <button className="mini-btn" onClick={() => setConfirmId(it.id)}>보관함에서 삭제</button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
