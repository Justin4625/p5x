import type { Unit } from './data';

/*
 * Skill reading: each unit's English skill text (from lufel.net) is scanned for what it
 * GIVES the team and what it WANTS from teammates. A pair scores when one unit gives
 * what the other wants. Every link names the skill it comes from, so it stays explainable.
 *
 * Keys
 *   ail:<Ailment>   inflicts that ailment (Burn, Freeze, Shock, Windswept, Curse, Forget, Sleep, Dizzy)
 *   ail:any         inflicts any elemental ailment         ail:spirit  inflicts a spiritual ailment
 *   debuff          lowers foe Defense or raises damage taken
 *   taken:<El>      raises foe <El> damage taken (taken:Resonance for Resonance damage)
 *   boost:<El>      boosts allies' <El> damage
 *   single          strong buff on one chosen ally (wants a main damage dealer)
 *   crit            crit rate / crit damage for allies
 *   gauge:Theurgy / gauge:Highlight   fills or triggers those
 *   shield, heal, maxhp, defup, acc (ailment accuracy), extraturn, down (lowers Down Points),
 *   blessing, techprec (Technical Precision), dot (damage over time), dotboost
 */

export type Side = Map<string, string>; // key -> skill name it comes from
export interface Profile { gives: Side; wants: Side }

const ELEMENT_WORDS: Record<string, string> = {
  Physical: 'Physical', Gun: 'Gun', Fire: 'Fire', Ice: 'Ice', Electric: 'Electric', Wind: 'Wind',
  Psychokinesis: 'Psychokinesis', Psy: 'Psychokinesis', Nuclear: 'Nuclear', Bless: 'Bless', Curse: 'Curse',
};
const DEALERS = new Set(['Sweeper', 'Assassin']);

/** Rules on one skill's text (own name already replaced by SELF). */
const GIVE_RULES: [string, RegExp][] = [
  ['ail:any', /inflict (?:a )?random elemental ailment/i],
  ['debuff', /[Dd]ecrease (?:the )?(?:target's |foes' |all foes' |all targets' )?Defense|[Ii]ncrease[^.]{0,40}damage taken|Decrease Defense by/],
  ['single', /(?:N (?:other )?ally|selected ally|ally besides|Costar|Dance Partner|Player N|Arcana Link)[\s\S]*[Ii]ncrease (?!SELF's)(?:the target's |their |the ally's |N (?:other )?ally's )?(?:Attack\b|critical)|[Ii]ncrease N (?:other )?ally's (?:Attack|critical|damage)|selected ally's Highlight/],
  ['crit', /[Ii]ncrease (?:the )?(?:party's|N (?:other )?ally's|all allies'|main target's|the main target's)[^.]{0,20}critical|party's critical (?:damage|rate)/],
  ['gauge:Theurgy', /Theurgy gauge by/],
  ['gauge:Highlight', /Highlight gauge|selected ally's Highlight|next time they activate a Highlight/],
  ['shield', /[Gg]rant (?:a |N |all allies N )?(?:[\w' ]+ )?shield[^.]{0,30}(?:ally|allies|party)|shield to (?:party|all allies|N ally)|grant them a shield|[Gg]rant all allies N [\w' ]*shield/],
  ['heal', /[Rr]estore[^.]{0,30}(?:party's HP|all allies' HP|HP to all allies|N ally's HP|HP to (?:the |N )?(?:selected )?ally|HP of allies|HP to party)|[Rr]estore HP equal to [^.]* to the ally|revive N KO'd ally/],
  ['maxhp', /(?:party's|their) max HP|max HP of allies/],
  ['defup', /[Ii]ncrease[^.]{0,15}(?:party's|all allies'|the ally's|target's)[^.]{0,60}?Defense|Increase Defense of N ally/],
  ['acc', /[Ii]ncrease[^.]{0,40}ailment accuracy by/],
  ['extraturn', /grant allies extra turns/],
  ['down', /[Dd]ecrease Down Points/],
  ['blessing', /[Gg]rant[^.]{0,40}Blessing stack/],
  ['techprec', /[Ii]ncrease (?:the main target's )?Technical Precision/],
  ['dotboost', /continuous damage by/],
  ['dot', /inflict (?:N )?(?:Burn|Bleed)|Year-End Flames: Take|Sacred Flame: When/i],
  ['taken:Resonance', /Resonance damage taken/],
];

const WANT_RULES: [string, RegExp][] = [
  ['ail:Shock', /(?:foe is|is already) Shocked/],
  ['ail:Burn', /(?:target|foe) is Burning|foe is inflicted with Burn|foes that were inflicted with Burn/],
  ['ail:any', /(?:target |foe )?has an elemental ailment|different elemental ailment|unique elemental ailments|foes with an elemental ailment/],
  ['ail:spirit', /foe is inflicted with [^.]*spiritual ailment/],
  ['debuff', /foes? with debuffs|foe has a debuff/],
  ['shield', /SELF has a shield/],
  ['defup', /Deal [^.]*of SELF's [Dd]efense/],
  ['maxhp', /Deal [^.]*of SELF's max HP/],
  ['heal', /[Ss]pend N of [^.]*HP|spends HP instead/],
  ['gauge:Theurgy', /Theurgy gauge is at/],
  ['extraturn', /used on an extra action/],
  ['acc', /SELF's ailment accuracy/],
  ['dot', /activate all continuous damage effects/],
  ['blessing', /gain Blessing stacks/],
  ['down', /lowers a foe's Down Points/],
  ['techprec', /activate (?:a |an )?(?:\w+ )?Technical|can activate \w+ Technicals?/],
  ['taken:Resonance', /counted as a Resonance|activate the Resonance/],
];

const cache = new Map<string, Profile>();

export function profile(u: Unit): Profile {
  const hit = cache.get(u.id);
  if (hit) return hit;
  const gives: Side = new Map();
  const wants: Side = new Map();
  const own = u.name.split(/\s+/).filter((w) => /^[A-Z]/.test(w)).map((w) => w.replace(/[^\w]/g, ''));
  const selfRe = own.length ? new RegExp(`\\b(?:${own.join('|')})\\b`, 'g') : null;

  for (const s of Object.values(u.skills)) {
    // Strip markup, collapse numbers ("29.3%/32.3%" -> "N") so "." only ends sentences, and name the unit SELF.
    let t = s.desc.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').replace(/\d+(?:\.\d+)?%?(?:\/\d+(?:\.\d+)?%?)*/g, 'N');
    if (selfRe) t = t.replace(selfRe, 'SELF').replace(/(?:SELF )+SELF/g, 'SELF');
    const add = (side: Side, k: string) => { if (!side.has(k)) side.set(k, s.name); };
    for (const [k, re] of GIVE_RULES) if (re.test(t)) add(gives, k);
    for (const [k, re] of WANT_RULES) if (re.test(t)) add(wants, k);
    for (const m of t.matchAll(/inflict(?:s|ed)? (?:N )?(Burn|Freeze|Shock|Windswept|Curse|Forget|Sleep|Dizzy)\b/gi)) {
      const ail = m[1][0].toUpperCase() + m[1].slice(1).toLowerCase();
      add(gives, `ail:${ail}`);
      add(gives, ['Forget', 'Sleep', 'Dizzy'].includes(ail) ? 'ail:spirit' : 'ail:any');
    }
    if (/Scald: Counts as Burn/.test(t)) add(gives, 'ail:Burn');
    // "Fire, Ice, Electric and Wind damage taken", "Ice damage taken"
    for (const m of t.matchAll(/((?:(?:Physical|Gun|Fire|Ice|Electric|Wind|Psychokinesis|Psy|Nuclear|Bless|Curse)(?:, | and |, and | or )?)+) damage taken/g)) {
      for (const w of m[1].split(/,? (?:and |or )?|, /)) if (ELEMENT_WORDS[w]) add(gives, `taken:${ELEMENT_WORDS[w]}`);
    }
    // "party's Electric damage", "When taking Wind damage, increase Attack", "when allies deal Wind damage"
    for (const m of t.matchAll(/(?:party's|[Ww]hen taking|when allies deal) (\w+) damage/g)) if (ELEMENT_WORDS[m[1]]) add(gives, `boost:${ELEMENT_WORDS[m[1]]}`);
  }

  if (DEALERS.has(u.role)) {
    const sk = Object.values(u.skills)[0]?.name ?? '';
    wants.set('single', sk);
    if (Object.values(u.skills).some((s) => /critical/.test(s.desc))) wants.set('crit', Object.values(u.skills).find((s) => /critical/.test(s.desc))!.name);
    for (const el of u.elements) { wants.set(`taken:${el}`, ''); wants.set(`boost:${el}`, ''); }
    const hl = u.skills.skill_highlight;
    if (hl && /^Deal/.test(hl.desc)) wants.set('gauge:Highlight', hl.name);
  }
  if (gives.has('dot')) wants.set('dotboost', gives.get('dot')!);
  // A Navigator that boosts damage on ailing foes wants ailment inflicters.
  if (u.navigator && Object.values(u.skills).some((s) => /foes with an elemental ailment/.test(s.desc))) wants.set('ail:any', Object.values(u.skills).find((s) => /foes with an elemental ailment/.test(s.desc))!.name);

  const p = { gives, wants };
  cache.set(u.id, p);
  return p;
}

const W: Record<string, number> = {
  taken: 2.5, boost: 2.5, 'ail:Shock': 2.5, 'ail:Burn': 2.5, 'ail:any': 2, 'ail:spirit': 2, debuff: 1.5,
  single: 1.5, crit: 1, 'gauge:Theurgy': 2, 'gauge:Highlight': 1.5, shield: 2, heal: 1, maxhp: 2, defup: 2,
  acc: 1.5, extraturn: 2, down: 1.5, blessing: 2, techprec: 1.5, dot: 2, dotboost: 1.5, 'taken:Resonance': 2.5,
};
const weightOf = (k: string) => W[k] ?? W[k.split(':')[0]] ?? 1;

const AIL_LABEL: Record<string, string> = { any: 'elemental ailments', spirit: 'spiritual ailments' };

function text(k: string, giver: Unit, gSkill: string, wanter: Unit, wSkill: string): string {
  const g = giver.codename || giver.name;
  const w = wanter.codename || wanter.name;
  const [kind, arg] = k.split(':');
  const gs = gSkill ? ` (${gSkill})` : '';
  const ws = wSkill ? ` (${wSkill})` : '';
  switch (kind) {
    case 'taken': return arg === 'Resonance'
      ? `${g} raises Resonance damage taken${gs}; ${w} deals Resonance damage${ws}.`
      : `${g} makes foes take more ${arg} damage${gs}; ${w} hits with ${arg}.`;
    case 'boost': return `${g} boosts allies' ${arg} damage${gs}; ${w} hits with ${arg}.`;
    case 'ail': return `${w} hits harder on foes with ${AIL_LABEL[arg] ?? arg}${ws}; ${g} inflicts ${AIL_LABEL[arg] ?? arg}${gs}.`;
    case 'debuff': return `${w} gains damage against debuffed foes${ws}; ${g} debuffs${gs}.`;
    case 'single': return `${g} buffs one chosen ally${gs}; ${w} is a main damage dealer to pour it into.`;
    case 'crit': return `${g} gives crit buffs${gs}; ${w} builds on crits${ws}.`;
    case 'gauge': return arg === 'Theurgy'
      ? `${g} fills the Theurgy gauge${gs}; ${w} relies on a Theurgy${ws}.`
      : `${g} speeds up or boosts Highlights${gs}; ${w} has a damage Highlight${ws}.`;
    case 'shield': return `${w} deals more damage while shielded${ws}; ${g} hands out shields${gs}.`;
    case 'heal': return `${w} spends HP${ws}; ${g} heals it back${gs}.`;
    case 'maxhp': return `${w} scales damage on max HP${ws}; ${g} raises max HP${gs}.`;
    case 'defup': return `${w} scales damage on Defense${ws}; ${g} raises Defense${gs}.`;
    case 'acc': return `${w} scales on ailment accuracy${ws}; ${g} raises it${gs}.`;
    case 'extraturn': return `${w} gets bonuses on extra actions${ws}; ${g} grants extra turns${gs}.`;
    case 'down': return `${w} speeds up when foes lose Down Points${ws}; ${g} strips Down Points${gs}.`;
    case 'blessing': return `${w} powers up from Blessing stacks${ws}; ${g} grants Blessing${gs}.`;
    case 'techprec': return `${w} triggers Technicals${ws}; ${g} raises Technical Precision${gs}.`;
    case 'dot': return `${w} detonates damage-over-time${ws}; ${g} applies it${gs}.`;
    case 'dotboost': return `${w} applies damage-over-time${ws}; ${g} boosts continuous damage${gs}.`;
    default: return `${g} and ${w} work together.`;
  }
}

/** Skill-text synergy between two units, both directions. Capped so lufel's curated data still leads. */
export const SKILL_CAP = 5;
export function skillLinks(a: Unit, b: Unit): { weight: number; text: string; key: string }[] {
  const out: { weight: number; text: string; key: string }[] = [];
  for (const [giver, wanter] of [[a, b], [b, a]] as const) {
    const G = profile(giver).gives;
    for (const [k, wSkill] of profile(wanter).wants) {
      // Any specific ailment satisfies "any elemental ailment".
      const gk = k === 'ail:any' ? [...G.keys()].find((x) => x.startsWith('ail:') && x !== 'ail:spirit') : G.has(k) ? k : undefined;
      if (!gk) continue;
      out.push({ key: k, weight: weightOf(k), text: text(k === 'ail:any' ? 'ail:any' : k, giver, G.get(gk)!, wanter, wSkill) });
    }
  }
  out.sort((x, y) => y.weight - x.weight);
  let total = 0;
  return out.filter((r) => (total += r.weight) <= SKILL_CAP + 0.01 || total - r.weight < 0.01);
}

const LABEL: Record<string, string> = {
  debuff: 'DEF down / damage taken', single: 'Buffs one ally', crit: 'Crit buffs', 'gauge:Theurgy': 'Theurgy gauge',
  'gauge:Highlight': 'Highlight boost', shield: 'Shields', heal: 'Healing', maxhp: 'Max HP', defup: 'Defense',
  acc: 'Ailment accuracy', extraturn: 'Extra turns', down: 'Down Points', blessing: 'Blessing', techprec: 'Technical Precision',
  dot: 'Damage over time', dotboost: 'DoT boost', 'taken:Resonance': 'Resonance damage taken', 'ail:any': 'Elemental ailment',
  'ail:spirit': 'Spiritual ailment',
};
/** Readable chips for the drawer: what this unit's skills bring and look for. */
export function profileLabels(u: Unit): { gives: string[]; wants: string[] } {
  const p = profile(u);
  const lab = (k: string, side: 'g' | 'w') => {
    if (LABEL[k]) return side === 'w' && k === 'heal' ? 'Healing (spends HP)' : LABEL[k];
    const [kind, arg] = k.split(':');
    if (kind === 'ail') return arg;
    if (kind === 'taken') return `${arg} damage taken`;
    if (kind === 'boost') return `${arg} damage up`;
    return k;
  };
  const gives = [...p.gives.keys()].filter((k) => !(k === 'ail:any' && [...p.gives.keys()].some((x) => /^ail:(?!any|spirit)/.test(x)))).map((k) => lab(k, 'g'));
  const wants = [...p.wants.keys()].filter((k) => !/^(taken|boost):(?!Resonance)/.test(k)).map((k) => lab(k, 'w'));
  return { gives: [...new Set(gives)], wants: [...new Set(wants)] };
}
