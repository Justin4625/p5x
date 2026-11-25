import raw from './data/units.json';
import tags from './data/tags.json';
import upcomingRaw from './data/upcoming.json';

export interface Skill { name: string; desc: string; type: string; sp: number | null }
export interface Rotation { label: string; steps: string[][] }
export interface Weapon { key: string; rarity: number; name: string; effect: string; desc: string }
/** lufel tier: rank 0 = T0. list 'kr' means the KR server list (used for units not on Global yet). */
export interface Tier { label: string; rank: number; awareness: number | null; list: 'global' | 'kr' }
/** rerun = the unit was already out on Global (3+ weeks before this banner). Times are UTC. */
export interface Banner { kind: 'unit' | 'weapon'; unit: string; name: string; title: string; start: string; end: string; rerun?: boolean }
export interface Unit {
  id: string;
  name: string;
  codename: string;
  persona: string;
  rarity: number;
  limited: boolean;
  elements: string[];
  role: string;
  roleDesc: string;
  color: string;
  navigator: boolean;
  order: number;
  speed: number | null;
  tags: string;
  tagsKr: string;
  review: string;
  skills: Record<string, Skill>;
  rotations: Rotation[];
  rotationNotes: string[];
  parties: { members: string[]; comment: string }[];
  friends: { id: string; comment: string }[];
  skillPriority: string;
  card: string | null;
  /** ISO date this unit first appeared in our data (null for the original roster). */
  added?: string | null;
  weapons: Weapon[];
  tier: Tier | null;
  tierKr: Tier | null;
  /** First Global release date (from lufel's schedule). */
  released?: string | null;
  /** Upcoming units only: estimated Global release date from lufel's schedule. */
  eta?: string | null;
  etaConfirmed?: boolean;
  /** English mechanic keywords, derived from tagsKr */
  mechanics: string[];
}

// lufel.net tags are Korean; src/data/tags.json maps the mechanic keywords we use to English.
// The scraper warns about tags missing from that file.
const TAG_EN: Record<string, string> = tags;

function mechanicsOf(tagsKr: string): string[] {
  const out = new Set<string>();
  for (const part of tagsKr.split(',').map((s) => s.trim()).filter(Boolean)) {
    if (TAG_EN[part]) out.add(TAG_EN[part]);
  }
  return [...out];
}

export const UNITS: Unit[] = (raw.units as unknown as Omit<Unit, 'mechanics'>[]).map((u) => ({
  ...u,
  mechanics: mechanicsOf(u.tagsKr),
}));
export const BY_ID = new Map(UNITS.map((u) => [u.id, u]));
/** Units announced for Global but not out yet (next ones on lufel's schedule). */
export const UPCOMING: Unit[] = (upcomingRaw.upcoming as unknown as Omit<Unit, 'mechanics'>[]).map((u) => ({
  ...u,
  mechanics: mechanicsOf(u.tagsKr),
}));
/** Global banners running now or announced, newest end date last. */
export const BANNERS = upcomingRaw.banners as Banner[];
/** Global + upcoming, for lookups that may hit either. */
export const ALL_BY_ID = new Map([...UNITS, ...UPCOMING].map((u) => [u.id, u]));
export const WONDER = BY_ID.get('원더')!;
export const SCRAPED = raw.scraped;

export const ELEMENTS = ['Physical', 'Gun', 'Fire', 'Ice', 'Electric', 'Wind', 'Psychokinesis', 'Nuclear', 'Bless', 'Curse', 'Almighty'];
const KNOWN_ROLES = ['Sweeper', 'Assassin', 'Strategist', 'Saboteur', 'Guardian', 'Medic', 'Virtuoso', 'Navigator'];
/** Known roles first, then any role a future unit brings (so it still gets a filter chip). */
export const ROLES = [...KNOWN_ROLES, ...new Set(UNITS.map((u) => u.role).filter((r) => r && !KNOWN_ROLES.includes(r)))];
/** Units added to the roster in the last 30 days get a NEW label. */
export const isNew = (u: Unit) => !!u.added && Date.now() - Date.parse(u.added) < 30 * 864e5;

export const ELEMENT_COLOR: Record<string, string> = {
  Physical: '#c9b28a', Gun: '#9aa3ad', Fire: '#ff4d2e', Ice: '#5fd3ff', Electric: '#ffe23d', Wind: '#4ef08f',
  Psychokinesis: '#ff5cd1', Nuclear: '#30f0d0', Bless: '#fff3a8', Curse: '#b04dff', Almighty: '#ffffff',
};
export const ELEMENT_SHORT: Record<string, string> = {
  Physical: 'PHYS', Gun: 'GUN', Fire: 'FIRE', Ice: 'ICE', Electric: 'ELEC', Wind: 'WIND', Psychokinesis: 'PSY',
  Nuclear: 'NUKE', Bless: 'BLESS', Curse: 'CURSE', Almighty: 'ALMT',
};
export const ROLE_SHORT: Record<string, string> = {
  Sweeper: 'SWP', Assassin: 'ASN', Strategist: 'STR', Saboteur: 'SAB', Guardian: 'GRD', Medic: 'MED',
  Virtuoso: 'VRT', Navigator: 'NAV',
};

// Rotation tokens on lufel.net mix skill numbers with Korean labels.
const TOKEN_KR: [RegExp, string][] = [
  [/단일/g, 'Single'], [/다중/g, 'Multi'], [/질풍/g, 'Wind'], [/변신/g, 'Transform'], [/펀치/g, 'Punch'],
  [/총기|총격/g, 'Gun'], [/근접/g, 'Melee'], [/특수/g, 'Special'], [/강화/g, 'Boost'], [/코어/g, 'Core'],
  [/턴/g, 'T'], [/크리티컬 확률/g, 'Crit Rate'], [/크리티컬 효과/g, 'Crit DMG'], [/관통/g, 'Pierce'],
  [/비약점/g, 'Non-weak'], [/불/g, '·Fire'], [/춘/g, '·Spring'], [/고/g, '·Heaven'],
];
export function translateKr(s: string): string {
  let out = s;
  for (const [re, en] of TOKEN_KR) out = out.replace(re, en);
  return out;
}

export interface Action { code: string; label: string; skill?: Skill; auto: boolean; idle: boolean }

/** Turn a lufel rotation token ("2↺", "HL", "ⓘA", "1") into a display action. */
export function parseAction(unit: Unit, token: string): Action {
  const auto = token.includes('↺');
  const t = translateKr(token.replace('↺', '').trim());
  if (t === '·' || t === '-' || t === '') return { code: '—', label: 'Hold', auto, idle: true };
  if (/^fatigue$/i.test(t)) return { code: 'FTG', label: 'Fatigue (no action)', auto, idle: true };
  if (t === 'HL') return { code: 'HL', label: unit.skills.skill_highlight?.name || 'Highlight', skill: unit.skills.skill_highlight, auto, idle: false };
  if (t === 'TH') return { code: 'TH', label: 'Theurgy', auto, idle: false };
  if (t.startsWith('ⓘ')) return { code: `IT${t.slice(1)}`, label: `Item ${t.slice(1)}`, auto, idle: false };
  const m = t.match(/^(\d)(.*)$/);
  if (m) {
    const skill = unit.skills[`skill${m[1]}`];
    return { code: `S${m[1]}${m[2]}`, label: skill?.name || `Skill ${m[1]}`, skill, auto, idle: false };
  }
  return { code: t.toUpperCase().slice(0, 8), label: t, auto, idle: false };
}
