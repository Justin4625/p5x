import raw from './data/units.json';

export interface Skill { name: string; desc: string; type: string; sp: number | null }
export interface Rotation { label: string; steps: string[][] }
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
  /** English mechanic keywords, derived from tagsKr */
  mechanics: string[];
}

// lufel.net tags are Korean; translate the mechanic keywords we use.
const TAG_EN: Record<string, string> = {
  '추가 턴': 'Extra Turn', '추가 효과': 'Follow-up', '총공격': 'All-out Attack', '화상': 'Burn', '동결': 'Freeze',
  '감전': 'Shock', '풍습': 'Windswept', '망각': 'Forget', '수면': 'Sleep', '원소 이상': 'Ailments',
  '지속 대미지': 'DoT', '다운': 'Down', 'HIGHLIGHT': 'Highlight', '테우르기아': 'Theurgy', '테우르기아 충전': 'Theurgy Charge',
  'HP 소모': 'HP Cost', '실드': 'Shield', '치료': 'Heal', '회복': 'Heal', '지속 회복': 'Regen', '부활': 'Revive',
  '방어력 감소': 'DEF Down', '받는 대미지 증가': 'Vulnerable', '공격력': 'ATK Up', '대미지보너스': 'DMG Bonus',
  '대미지 보너스': 'DMG Bonus', '크리티컬 효과': 'Crit DMG', '크리티컬 확률': 'Crit Rate', '크리티컬': 'Crit',
  '관통': 'Pierce', 'TECHNICAL': 'Technical', '변신': 'Transform', '폼 체인지': 'Form Change', '스킬마스터': 'Skill Master',
  '아이템': 'Items', '차지': 'Charge', '반격': 'Counter', '최대 생명': 'Max HP', '최대 생명 증가': 'Max HP',
  '공격받을 확률 증가': 'Taunt', '디버프 제거': 'Cleanse', '원소 이상 제거': 'Cleanse', 'SP 회복': 'SP Regen',
  '효과 명중': 'Effect Hit', '대미지 축적': 'DMG Stack', '스킬 계수 증가': 'Skill Mult', '공격력 감소': 'ATK Down',
  '방어력': 'DEF Up', '효과 저항': 'Effect RES', '아군 교체': 'Ally Swap', '해명의 힘': 'Elucidation',
  '적합성 저하': 'Affinity Down', '버추얼 라이브': 'Virtual Live', '원더 페르소나 강화': 'Wonder Boost',
  '직업 선택': 'Role Select', '총기': 'Gun', '총격': 'Gun', '축복': 'Bless', '주원': 'Curse',
  '화염 광역': 'Fire AoE', '추가효과 단일': 'Follow-up', '빙결 속성 TECHNICAL': 'Ice Technical',
  '화염 속성 TECHNICAL': 'Fire Technical', '전격 대미지보너스': 'Elec DMG Bonus', '복합 속성': 'Multi-element', '흡수': 'Drain',
};

function mechanicsOf(tagsKr: string): string[] {
  const out = new Set<string>();
  for (const part of tagsKr.split(',').map((s) => s.trim()).filter(Boolean)) {
    if (TAG_EN[part]) out.add(TAG_EN[part]);
  }
  return [...out];
}

export const UNITS: Unit[] = (raw.units as Omit<Unit, 'mechanics'>[]).map((u) => ({
  ...u,
  mechanics: mechanicsOf(u.tagsKr),
}));
export const BY_ID = new Map(UNITS.map((u) => [u.id, u]));
export const WONDER = BY_ID.get('원더')!;
export const SCRAPED = raw.scraped;

export const ELEMENTS = ['Physical', 'Gun', 'Fire', 'Ice', 'Electric', 'Wind', 'Psychokinesis', 'Nuclear', 'Bless', 'Curse', 'Almighty'];
export const ROLES = ['Sweeper', 'Assassin', 'Strategist', 'Saboteur', 'Guardian', 'Medic', 'Virtuoso', 'Navigator'];

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
