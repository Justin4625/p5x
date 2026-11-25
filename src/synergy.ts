import { ALL_BY_ID, type Unit } from './data';
import { skillLinks } from './skills';

/*
 * Synergy model. Sources, strongest first:
 *  1. lufel.net "best partners" (friends) with their written reason.     +3..5
 *     (less when the unit lists many partners)
 *  2. Shared lufel.net recommended teams (per co-listing, max 3).          +2 each
 *  3. Skill reading (src/skills.ts): one unit's skills give what the other's
 *     skills want (element vulnerability → dealer of that element, Burn →
 *     "hits harder on Burning foes", shields → "stronger while shielded",
 *     Theurgy gauge → Theurgy user, ...). Each link names both skills.      +1..2.5 each, max 5 per pair
 *  3b. Fallback from lufel tags: element supporter + dealer of that element,
 *     only when the skill reading found no element link.                    +1.5
 *  4. Shared core mechanic (Burn, Freeze, Shock, Windswept, Theurgy...).    +1.5
 *  5. Role balance: fills a missing sustain or support role.               +1
 *     A third damage dealer in a team that already has two.               -1.5
 */

export interface Reason { text: string; weight: number; with?: string }
export interface Match { score: number; tier: 'best' | 'good' | 'none'; reasons: Reason[] }

const DEALERS = new Set(['Sweeper', 'Assassin']);
const SUPPORT = new Set(['Strategist', 'Saboteur', 'Virtuoso']);
const SUSTAIN = new Set(['Medic', 'Guardian']);

// Down and Highlight are left out: too many units have them to say anything.
const CORE_MECHANICS = ['Burn', 'Freeze', 'Shock', 'Windswept', 'DoT', 'Extra Turn', 'Theurgy', 'Theurgy Charge', 'Ailments', 'Transform', 'HP Cost'];

/** Mechanics that signal "this unit powers one element". */
const ELEMENT_SIGNAL: Record<string, string> = {
  'Fire AoE': 'Fire', 'Fire Technical': 'Fire', Burn: 'Fire', 'Ice Technical': 'Ice', Freeze: 'Ice',
  Shock: 'Electric', 'Elec DMG Bonus': 'Electric', Windswept: 'Wind', Bless: 'Bless', Curse: 'Curse', Gun: 'Gun',
};

export function poweredElements(u: Unit): string[] {
  if (DEALERS.has(u.role)) return [];
  const out = new Set<string>();
  for (const m of u.mechanics) if (ELEMENT_SIGNAL[m]) out.add(ELEMENT_SIGNAL[m]);
  return [...out];
}

function short(u: Unit) { return u.codename || u.name; }

/** Synergy of one candidate with one team member. */
export function pairReasons(c: Unit, m: Unit): Reason[] {
  const out: Reason[] = [];
  const f1 = m.friends.find((f) => f.id === c.id);
  const f2 = c.friends.find((f) => f.id === m.id);
  if (f1 || f2) {
    // A unit that lists many partners endorses each one less strongly.
    const n = Math.max(f1 ? m.friends.length : 0, f2 ? c.friends.length : 0);
    const weight = 3 + 2 * Math.min(1, 4 / Math.max(n, 1));
    out.push({ weight, with: m.id, text: (f1 || f2)!.comment || `lufel.net lists ${short(c)} as a top partner for ${short(m)}.` });
  }
  const together = [...m.parties, ...c.parties].filter((p) => p.members.includes(c.id) && p.members.includes(m.id)).length;
  if (together) out.push({ weight: Math.min(together, 3) * 2, with: m.id, text: `Together in ${together} recommended ${together > 1 ? 'teams' : 'team'}.` });

  const links = skillLinks(c, m);
  for (const l of links) out.push({ weight: l.weight, with: m.id, text: l.text });
  const elementLinked = links.some((l) => /^(taken|boost):/.test(l.key));
  for (const [sup, dealer] of [[m, c], [c, m]] as const) {
    if (elementLinked || !DEALERS.has(dealer.role)) continue;
    const el = poweredElements(sup).find((e) => dealer.elements.includes(e));
    if (el) out.push({ weight: 1.5, with: m.id, text: `lufel tags ${short(sup)} as ${el} support; ${short(dealer)} deals ${el}.` });
  }
  const shared = CORE_MECHANICS.filter((k) => c.mechanics.includes(k) && m.mechanics.includes(k));
  if (shared.length) out.push({ weight: 1.5, with: m.id, text: `Both build around ${shared.slice(0, 2).join(' & ')}.` });
  return out;
}

export function matchFor(c: Unit, team: Unit[]): Match {
  const others = team.filter((m) => m.id !== c.id);
  if (!others.length) return { score: 0, tier: 'none', reasons: [] };
  const reasons = others.flatMap((m) => pairReasons(c, m));

  if (!c.navigator) {
    const roles = others.filter((m) => !m.navigator).map((m) => m.role);
    if (SUSTAIN.has(c.role) && !roles.some((r) => SUSTAIN.has(r))) reasons.push({ weight: 1, text: 'Team has no Medic or Guardian yet.' });
    if (SUPPORT.has(c.role) && !roles.some((r) => SUPPORT.has(r))) reasons.push({ weight: 1, text: 'Team has no buffer or debuffer yet.' });
    if (DEALERS.has(c.role) && roles.filter((r) => DEALERS.has(r)).length >= 2) reasons.push({ weight: -1.5, text: 'Already two damage dealers.' });
  }
  const score = reasons.reduce((s, r) => s + r.weight, 0);
  const tier = score >= 5 ? 'best' : score >= 2.5 ? 'good' : 'none';
  reasons.sort((a, b) => b.weight - a.weight);
  return { score, tier, reasons };
}

/** Team-wide score 0..100 for the meter. */
/** Rank candidates: the top strong matches are BEST, the next decent ones GOOD. */
export function rankTiers(matches: Map<string, Match>, best = 4, good = 12) {
  const ranked = [...matches.entries()].filter(([, m]) => m.score >= 2.5).sort((a, b) => b[1].score - a[1].score);
  for (const [, m] of matches) m.tier = 'none';
  ranked.forEach(([, m], i) => { m.tier = i < best && m.score >= 5 ? 'best' : i < good ? 'good' : 'none'; });
}

const pairCache = new Map<string, number>();
/** Sum of pairReasons weights for a pair, cached (team search calls this a lot). */
export function pairTotal(a: Unit, b: Unit): number {
  const k = a.id < b.id ? `${a.id}|${b.id}` : `${b.id}|${a.id}`;
  let v = pairCache.get(k);
  if (v === undefined) { v = pairReasons(a, b).reduce((s, r) => s + r.weight, 0); pairCache.set(k, v); }
  return v;
}

export function teamScore(team: Unit[]): { score: number; label: string } {
  if (team.length < 2) return { score: 0, label: 'Pick your thieves' };
  let pairs = 0;
  let total = 0;
  for (let i = 0; i < team.length; i++) {
    for (let j = i + 1; j < team.length; j++) {
      pairs++;
      total += pairTotal(team[i], team[j]);
    }
  }
  const fighters = team.filter((u) => !u.navigator);
  let bonus = 0;
  if (fighters.some((u) => SUSTAIN.has(u.role))) bonus += 6;
  if (fighters.some((u) => SUPPORT.has(u.role))) bonus += 6;
  if (fighters.some((u) => DEALERS.has(u.role))) bonus += 6;
    // A full crew of three thieves is needed for a top score.
  const fill = 0.55 + 0.15 * Math.min(3, fighters.length);
  const score = Math.max(0, Math.min(100, Math.round(((total / pairs) * 6 + bonus) * fill)));
  const label = score >= 80 ? 'Calling card ready' : score >= 55 ? 'Solid heist' : score >= 30 ? 'Workable' : 'Loose crew';
  return { score, label };
}

export function unit(id: string | null | undefined): Unit | undefined {
  return id ? ALL_BY_ID.get(id) : undefined;
}
