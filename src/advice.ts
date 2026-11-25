import { UNITS, UPCOMING, BANNERS, ALL_BY_ID, type Unit, type Weapon, type Banner } from './data';
import { teamScore, pairTotal, pairReasons, matchFor } from './synergy';
import type { Collection } from './collection';

/*
 * "Should I pull?" — advice for units on a Global banner now or coming soon, based on
 * the units you own. Every point comes with a sentence, so the verdict is explainable.
 *
 *  Crew upgrade   best 3-thief crew from your units, with vs. without this one   up to +30
 *                 crew value = team synergy score × 0.5 + member strength
 *                 (tier T0 20, T0.5 16, T1 12, T2 8, T3 4, T4 0, unrated 6)
 *  Partners       your units it pairs strongly with (pair synergy ≥ 4)           +5 each, up to +15
 *  Role gap       you own no unit of its kind (damage / support / sustain)       +15
 *                 first damage dealer of its element                              +4
 *  Strength       lufel tier: T0 25, T0.5 18, T1 12, T2 6, T3 2, T4 0           (KR list for units not out yet)
 *  Limited        limited +8; standard −5 (can still come from standard pulls or a gold ticket)
 *  Redundant      you already own a unit of the same role at the same or better tier   −8
 *  Navigators     no navigator yet +20, or a better fit for your best crew than yours  up to +20
 *
 *  Score ≥ 50 PULL · 32–49 MAYBE · below 32 SKIP
 *
 * Weapon (5★ signature): only for a unit you own or should pull. WORTH IT when the unit is
 * in your best crew and is a damage dealer or T0; OPTIONAL when it's in the crew or high
 * tier; otherwise SKIP.
 */

export type Verdict = 'owned' | 'pull' | 'maybe' | 'skip' | 'unknown';
export interface Point { text: string; pts: number }
export interface WeaponAdvice { weapon: Weapon; verdict: 'owned' | 'worth' | 'optional' | 'skip'; text: string }
export interface Advice {
  unit: Unit;
  verdict: Verdict;
  score: number;
  points: Point[];
  crew?: { members: Unit[]; score: number };
  weapon?: WeaponAdvice;
}
export interface Candidate { unit: Unit; banner?: Banner; weaponBanner?: Banner; upcoming: boolean }

const DEALERS = new Set(['Sweeper', 'Assassin', 'Virtuoso']);
const SUPPORT = new Set(['Strategist', 'Saboteur']);
const SUSTAIN = new Set(['Medic', 'Guardian']);
const group = (u: Unit) => (DEALERS.has(u.role) ? 'damage' : SUPPORT.has(u.role) ? 'support' : SUSTAIN.has(u.role) ? 'sustain' : '');
const GROUP_TEXT: Record<string, string> = { damage: 'damage dealer', support: 'buffer or debuffer', sustain: 'healer or tank' };
const TIER_PTS = [25, 18, 12, 6, 2, 0];
const name = (u: Unit) => u.codename || u.name;

/** Units on a Global banner now, then upcoming ones; banner weapons are attached to their unit. */
export function candidates(): Candidate[] {
  const out = new Map<string, Candidate>();
  for (const b of BANNERS) {
    const unit = ALL_BY_ID.get(b.unit);
    if (!unit) continue;
    const c = out.get(unit.id) ?? { unit, upcoming: !UNITS.includes(unit) };
    if (b.kind === 'unit') c.banner ??= b; else c.weaponBanner ??= b;
    out.set(unit.id, c);
  }
  // 4★ units come free (story, events) or from the standard pool, so there's nothing to save pulls for.
  for (const unit of UPCOMING) if (!out.has(unit.id) && Number(unit.rarity) >= 5) out.set(unit.id, { unit, upcoming: true });
  return [...out.values()];
}

const STRENGTH = [20, 16, 12, 8, 4, 0];
const strength = (u: Unit) => (u.tier ? STRENGTH[u.tier.rank] ?? 0 : 6);
/** Crew value: synergy (team meter 0–100) scaled down, plus how strong the members are. */
export const crewValue = (members: Unit[]) => Math.round(teamScore(members).score * 0.5 + members.reduce((s, m) => s + strength(m), 0));

/** Best crew of up to 3 thieves from a pool, optionally forced to include one unit. */
const crewMemo = new Map<string, { members: Unit[]; score: number }>();
export function bestCrew(pool: Unit[], must?: Unit): { members: Unit[]; score: number } {
  const key = `${must?.id ?? ''}|${pool.map((u) => u.id).sort().join(',')}`;
  const hit = crewMemo.get(key);
  if (hit) return hit;
  if (crewMemo.size > 500) crewMemo.clear();
  const res = searchCrew(pool, must);
  crewMemo.set(key, res);
  return res;
}
function searchCrew(pool: Unit[], must?: Unit): { members: Unit[]; score: number } {
  const rest = pool.filter((u) => !u.navigator && u !== must && u.id !== '원더');
  const need = Math.min(3, rest.length + (must ? 1 : 0)) - (must ? 1 : 0);
  let best = { members: must ? [must] : [], score: 0 };
  const pick = (start: number, chosen: Unit[]) => {
    if (chosen.length === need) {
      const members = must ? [must, ...chosen] : chosen;
      if (members.length >= 2) {
        const score = crewValue(members);
        if (score > best.score) best = { members, score };
      }
      return;
    }
    for (let i = start; i < rest.length; i++) pick(i + 1, [...chosen, rest[i]]);
  };
  pick(0, []);
  return best;
}

function tierPoint(u: Unit): Point {
  const t = u.tier;
  if (!t) return { pts: 8, text: 'No lufel tier rating yet.' };
  const where = t.list === 'kr' ? 'lufel KR tier' : 'lufel Global tier';
  const note = t.list === 'kr' ? ' (KR is ahead of Global, so this is how it plays once it lands)' : '';
  const aw = t.awareness ? `, rated at A${t.awareness}` : '';
  return { pts: TIER_PTS[t.rank] ?? 0, text: `${where}: ${t.label}${aw}${note}.` };
}

export function advise(c: Candidate, col: Collection): Advice {
  const u = c.unit;
  const owned = UNITS.filter((x) => col.has(x.id) && x.id !== '원더');
  const fighters = owned.filter((x) => !x.navigator);
  const points: Point[] = [];
  let crew: Advice['crew'];

  if (col.has(u.id)) {
    const base = bestCrew(fighters);
    return { unit: u, verdict: 'owned', score: 0, points: [], crew: base, weapon: weaponAdvice(u, col, true, base.members.includes(u)) };
  }

  if (u.navigator) {
    const crewNow = bestCrew(fighters).members;
    const navis = owned.filter((x) => x.navigator);
    if (!navis.length) points.push({ pts: 20, text: "You don't own a navigator yet." });
    else if (crewNow.length) {
      const fit = (n: Unit) => matchFor(n, crewNow).score;
      const mine = Math.max(...navis.map(fit));
      const theirs = fit(u);
      const bestNavi = navis.reduce((a, b) => (fit(b) > fit(a) ? b : a));
      if (theirs > mine) points.push({ pts: Math.min(20, Math.round((theirs - mine) * 3)), text: `Fits your best crew (${crewNow.map(name).join(', ')}) better than ${name(bestNavi)}.` });
      else points.push({ pts: 0, text: `${name(bestNavi)} already fits your best crew as well or better.` });
    }
  } else if (fighters.length < 2) {
    points.push({ pts: 0, text: 'Tick at least 2 units you own to get crew-based advice.' });
  } else {
    const base = bestCrew(fighters);
    const withIt = bestCrew([...fighters, u], u);
    const delta = withIt.score - base.score;
    crew = withIt;
    if (delta > 0) {
      points.push({ pts: Math.min(30, Math.round(delta * 2)), text: `Makes your best crew stronger: ${withIt.members.map(name).join(' + ')} (crew value ${base.score} → ${withIt.score}).` });
    } else {
      points.push({ pts: 0, text: `Doesn't beat your current best crew, ${base.members.map(name).join(' + ')} (crew value ${base.score} vs ${withIt.score}).` });
    }
    const partners = fighters.map((x) => ({ x, s: pairTotal(u, x) })).filter((p) => p.s >= 4).sort((a, b) => b.s - a.s);
    if (partners.length) {
      const top = partners[0];
      const why = pairReasons(u, top.x).sort((a, b) => b.weight - a.weight)[0];
      points.push({ pts: Math.min(15, partners.length * 5), text: `Pairs well with ${partners.slice(0, 4).map((p) => name(p.x)).join(', ')}${why ? `. ${name(top.x)}: ${why.text}` : '.'}` });
    }
  }

  if (!u.navigator && owned.length) {
    const g = group(u);
    if (g && !fighters.some((x) => group(x) === g)) points.push({ pts: 15, text: `You own no ${GROUP_TEXT[g]} yet.` });
    if (g === 'damage' && u.elements[0] && !fighters.some((x) => group(x) === 'damage' && x.elements.includes(u.elements[0]))) {
      points.push({ pts: 4, text: `Your first ${u.elements[0]} damage dealer.` });
    }
    const better = fighters.filter((x) => x.role === u.role && x.tier && u.tier && x.tier.rank <= u.tier.rank);
    if (better.length) points.push({ pts: -8, text: `You already have ${better.slice(0, 2).map((x) => `${name(x)} (${x.tier!.label})`).join(', ')} as ${u.role}.` });
  }

  points.push(tierPoint(u));
  points.push(u.limited
    ? c.banner?.rerun
      ? { pts: 8, text: 'Limited rerun: limited units come back rarely, so this may be your last chance for a while.' }
      : { pts: 8, text: 'Limited: it won\'t join the standard banner later.' }
    : { pts: -5, text: 'Standard unit: can still come from standard pulls or a gold ticket.' });

  const score = Math.max(0, Math.min(100, points.reduce((s, p) => s + p.pts, 0)));
  // Without any ticked units there is nothing to compare with: show the facts, no verdict.
  const verdict: Verdict = !owned.length ? 'unknown' : score >= 50 ? 'pull' : score >= 32 ? 'maybe' : 'skip';
  const inCrew = !!crew && crew.members.includes(u) && (points[0]?.pts ?? 0) > 0;
  return { unit: u, verdict, score, points, crew, weapon: weaponAdvice(u, col, verdict === 'pull', inCrew) };
}

function weaponAdvice(u: Unit, col: Collection, haveOrPull: boolean, inCrew: boolean): WeaponAdvice | undefined {
  const weapon = u.weapons.find((w) => w.rarity === 5);
  if (!weapon) return undefined;
  if (col.get(u.id)?.w) return { weapon, verdict: 'owned', text: 'You have it.' };
  if (!haveOrPull) return { weapon, verdict: 'skip', text: `Only useful on ${name(u)}. Get the unit first.` };
  const dealer = DEALERS.has(u.role);
  const top = (u.tier?.rank ?? 9) <= 1;
  const own = col.has(u.id);
  const If = own ? '' : 'If you pull it, ';
  if (inCrew && (dealer || u.tier?.rank === 0)) {
    return { weapon, verdict: 'worth', text: `${If}${name(u)} ${own ? 'is' : 'goes'} in your best crew${dealer ? ' as a damage dealer, where a signature weapon adds the most' : ' and is rated T0'}.` };
  }
  if (inCrew || top) return { weapon, verdict: 'optional', text: `${own ? 'Nice upgrade' : `Nice to have once you pull ${name(u)}`}, but it works with a 4★ weapon too. Unit first, weapon with leftover pulls.` };
  return { weapon, verdict: 'skip', text: `${name(u)} isn't in your best crew. Spend your pulls elsewhere.` };
}
