import { UNITS, ALL_BY_ID, type Unit } from './data';

/*
 * Your collection: which Global units you own, their awareness (A0–A6) and whether
 * you have their 5★ signature weapon. Saved in this browser (localStorage); a share
 * link (#have=...) moves it to another device.
 */
export interface Owned { a: number; w: boolean }
export type Collection = Map<string, Owned>;

const KEY = 'p5x-collection';

export function loadCollection(): Collection {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '{}') as Record<string, Owned>;
    return new Map(Object.entries(raw).filter(([id]) => ALL_BY_ID.has(id)));
  } catch { return new Map(); }
}

export function saveCollection(c: Collection) {
  try { localStorage.setItem(KEY, JSON.stringify(Object.fromEntries(c))); } catch { /* private mode */ }
}

// Link format: codenames (ASCII, unique) with awareness and "w" for the weapon: JOKER6w.SKULL0
const byCode = () => new Map(UNITS.map((u) => [u.codename || u.name, u]));

export function encodeCollection(c: Collection): string {
  return [...c].map(([id, o]) => {
    const u = ALL_BY_ID.get(id)!;
    return `${u.codename || u.name}~${o.a}${o.w ? 'w' : ''}`;
  }).join('.');
}

export function decodeCollection(s: string): Collection {
  const map = byCode();
  const out: Collection = new Map();
  for (const part of s.split('.')) {
    const m = part.match(/^(.+)~(\d)(w?)$/);
    const u = m && map.get(m[1]);
    if (u) out.set(u.id, { a: Math.min(6, Number(m![2])), w: !!m![3] });
  }
  return out;
}

export const ownedUnits = (c: Collection): Unit[] => [...c.keys()].map((id) => ALL_BY_ID.get(id)).filter(Boolean) as Unit[];
