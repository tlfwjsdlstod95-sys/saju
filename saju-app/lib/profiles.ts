// 내 사주 보관함 — localStorage 기반 다중 프로필 저장
'use client';

const KEY = 'saju_profiles_v1';

export interface Profile {
  id: string;
  name: string;
  year: number; month: number; day: number;
  hour: number | null; minute: number;
  city: string; sex: 'M' | 'F'; unknownTime: boolean;
  summary?: { emoji: string; motif: string; ilju: string };
  savedAt: number;
}

export function listProfiles(): Profile[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as Profile[];
    return Array.isArray(arr) ? arr.sort((a, b) => b.savedAt - a.savedAt) : [];
  } catch { return []; }
}

function write(list: Profile[]) {
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch {}
}

/** 같은 이름+생년월일이면 갱신, 아니면 추가 */
export function saveProfile(p: Omit<Profile, 'id' | 'savedAt'>): Profile[] {
  const list = listProfiles();
  const dupKey = (x: { name: string; year: number; month: number; day: number; hour: number | null }) =>
    `${x.name}|${x.year}-${x.month}-${x.day}|${x.hour ?? 'x'}`;
  const idx = list.findIndex((x) => dupKey(x) === dupKey(p));
  const profile: Profile = { ...p, id: idx >= 0 ? list[idx].id : `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, savedAt: Date.now() };
  if (idx >= 0) list[idx] = profile; else list.push(profile);
  write(list);
  return listProfiles();
}

export function removeProfile(id: string): Profile[] {
  write(listProfiles().filter((p) => p.id !== id));
  return listProfiles();
}
