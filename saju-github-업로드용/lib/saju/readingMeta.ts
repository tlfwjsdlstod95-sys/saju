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

/** 스트리밍 마커 텍스트(@@key@@)를 누적 파싱 → {lead, sections} */
export function parseReadingStream(
  text: string,
  keys: readonly string[] = READING_KEYS,
  icons: Record<string, string> = READING_ICONS,
  labels: Record<string, string> = READING_LABELS,
): { lead: string; sections: ReadingSection[] } {
  const parts = text.split(/@@(\w+)@@/); // [pre, key, content, key, content, ...]
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
