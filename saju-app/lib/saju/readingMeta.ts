// 풀이 섹션 메타 — 서버/클라이언트 공용 (순수 상수, server-only 의존 없음)
export const READING_KEYS = [
  'essence', 'weapon', 'weakness', 'thisyear', 'love',
  'money', 'health', 'people', 'bigpicture', 'last',
] as const;

export const READING_ICONS: Record<string, string> = {
  essence: '☯', weapon: '⚔', weakness: '⛓', thisyear: '🌗', love: '❤',
  money: '🪙', health: '🌿', people: '🤝', bigpicture: '🌌', last: '✉',
};

export const READING_LABELS: Record<string, string> = {
  essence: '당신이라는 사람', weapon: '타고난 무기', weakness: '발목 잡는 것',
  thisyear: '지금 이 시기', love: '연애', money: '돈이랑 진로',
  health: '몸이랑 에너지', people: '사람복', bigpicture: '큰 그림', last: '마지막으로',
};

// 궁합 AI 풀이 섹션
export const GUNGHAP_KEYS = ['overview', 'attraction', 'good', 'friction', 'advice', 'last'] as const;
export const GUNGHAP_ICONS: Record<string, string> = {
  overview: '☯', attraction: '💘', good: '✨', friction: '⚡', advice: '🧭', last: '✉',
};
export const GUNGHAP_LABELS: Record<string, string> = {
  overview: '한눈에 본 두 사람', attraction: '첫인상과 끌림', good: '잘 맞는 점',
  friction: '부딪히는 점', advice: '오래가는 법', last: '한마디',
};

export interface ReadingSection { key: string; icon: string; label: string; title: string; body: string; }

/**
 * 십신 한자 고정표 (2026-09-28) — AI 가 「상관(相官)」처럼 **틀린 한자**를 쓰는 일이 라이브에서 확인됐다(정답 傷官).
 * 프롬프트(STYLE_GUARD)에도 같은 표를 넣지만, 모델이 어겨도 화면에는 틀린 한자가 나가지 않게 표시 단계에서 한 번 더 바로잡는다.
 * 규칙: 「십신명(한자)」 괄호 안이 **한자만**이고 정답과 다르면 정답으로 바꾼다. 한글 풀이 괄호(「상관(규칙을 고치는 기운)」)는 건드리지 않는다.
 */
export const SIPSIN_HANJA: Record<string, string> = {
  비견: '比肩', 겁재: '劫財', 식신: '食神', 상관: '傷官', 편재: '偏財',
  정재: '正財', 편관: '偏官', 정관: '正官', 편인: '偏印', 정인: '正印',
};
/** 편관의 다른 이름(七殺)처럼 **맞는 이표기**는 그대로 둔다 */
const HANJA_ALT: Record<string, string[]> = { 편관: ['七殺', '七煞'], 편인: ['梟神'] };
export function fixSipsinHanja(text: string): string {
  // 괄호 안이 「相官)」처럼 한자로 끝나든, 「相官 — 자유·표현…)」처럼 한자 뒤에 풀이가 이어지든 한자 부분만 바꾼다(라이브에서 둘 다 확인)
  return text.replace(/(비견|겁재|식신|상관|편재|정재|편관|정관|편인|정인)\(([\u4E00-\u9FFF]{1,4})(?=[)\s—–\-·,:])/g, (all, name: string, han: string) => {
    const ok = SIPSIN_HANJA[name];
    return han === ok || (HANJA_ALT[name] ?? []).includes(han) ? all : `${name}(${ok}`;
  });
}

/** 이미 파싱돼 저장된 풀이(브라우저 캐시·세션 복원)에도 같은 교정을 건다 — 캐시는 parseReadingStream 을 다시 거치지 않는다 */
export function fixReadingHanja<T extends { lead: string; sections: { title: string; body: string }[] }>(r: T): T {
  return { ...r, lead: fixSipsinHanja(r.lead), sections: r.sections.map((x) => ({ ...x, title: fixSipsinHanja(x.title), body: fixSipsinHanja(x.body) })) };
}

/** 스트리밍 마커 텍스트(@@key@@)를 누적 파싱 → {lead, sections} */
export function parseReadingStream(
  text: string,
  keys: readonly string[] = READING_KEYS,
  icons: Record<string, string> = READING_ICONS,
  labels: Record<string, string> = READING_LABELS,
): { lead: string; sections: ReadingSection[] } {
  const parts = fixSipsinHanja(text).split(/@@(\w+)@@/); // [pre, key, content, key, content, ...]
  let lead = '';
  const map: Record<string, { title: string; body: string }> = {};
  for (let i = 1; i < parts.length; i += 2) {
    const key = parts[i];
    const content = parts[i + 1] ?? '';
    if (key === 'lead') { lead = content.trim(); continue; }
    const nl = content.indexOf('\n');
    const title = (nl < 0 ? content : content.slice(0, nl)).trim();
    const body = (nl < 0 ? '' : content.slice(nl + 1)).trim();
    map[key] = { title, body };
  }
  const sections = keys
    .filter((k) => map[k] && (map[k].title || map[k].body))
    .map((k) => ({ key: k, icon: icons[k], label: labels[k], title: map[k].title, body: map[k].body }));
  return { lead, sections };
}
