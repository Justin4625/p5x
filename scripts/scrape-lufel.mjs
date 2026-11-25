// Scrapes Global-server P5X unit data from lufel.net into src/data/units.json
// and downloads card art into public/cards/. Re-run when lufel.net updates:
//   node scripts/scrape-lufel.mjs
// A GitHub Action (.github/workflows/update-units.yml) runs this daily, so new
// Global units are added automatically.
//
// Safety: a unit whose files fail to load keeps its previous data; if the roster
// itself looks broken (empty, or far smaller than before) nothing is written and
// the script exits with code 1. Warnings (unknown roles, tags, missing art or
// English skills) go to stdout and, in GitHub Actions, to the job summary.
// Data files on lufel.net are plain JS (window.x = ...). They run inside a vm
// context whose global has no prototype, and only JSON strings come back out.
import vm from 'node:vm';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import sharp from 'sharp';

const BASE = 'https://lufel.net';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const CARD_DIR = path.join(ROOT, 'public/cards');
const OUT = path.join(ROOT, 'src/data/units.json');
const TAGS = path.join(ROOT, 'src/data/tags.json');
const warnings = [];
const warn = (msg) => {
  warnings.push(msg);
  console.warn(`\n! ${msg}`);
  if (process.env.GITHUB_ACTIONS) console.log(`::warning::${msg.replace(/\n/g, ' ')}`); // shows on the run page
};
/** Stable card file name per unit, so new units in the middle of the list don't shift the art. */
const cardName = (id) => `${createHash('sha1').update(id).digest('hex').slice(0, 12)}.webp`;

const ELEMENT = {
  물리: 'Physical', 총격: 'Gun', 화염: 'Fire', 빙결: 'Ice', 전격: 'Electric', 질풍: 'Wind',
  염동: 'Psychokinesis', 핵열: 'Nuclear', 축복: 'Bless', 주원: 'Curse', 만능: 'Almighty',
};
// lufel position -> Global English role name
const ROLE = {
  지배: 'Sweeper', 반항: 'Assassin', 우월: 'Strategist', 굴복: 'Saboteur',
  방위: 'Guardian', 구원: 'Medic', 해명: 'Elucidator', 자율: 'Virtuoso',
};

const TYPE = {
  단일피해: 'Single target', 광역피해: 'AoE', 버프: 'Buff', 디버프: 'Debuff', 치료: 'Heal', 회복: 'Heal',
  실드: 'Shield', 패시브: 'Passive', 하이라이트: 'Highlight', 특수: 'Special', 방어: 'Defense',
};

/** null = the file doesn't exist (404 / HTML page). Throws on network trouble after 3 tries. */
async function getText(url) {
  for (let i = 0; ; i++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      return text.trimStart().startsWith('<') ? null : text; // 404 page is HTML
    } catch (e) {
      if (i >= 2) throw new Error(`${url}: ${e.message}`);
      await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
    }
  }
}

function evalData(code, exprs) {
  const ctx = vm.createContext(Object.create(null));
  vm.runInContext('var window = {}; var self = window;', ctx);
  try { vm.runInContext(code, ctx, { timeout: 2000 }); } catch (e) { return null; }
  const out = {};
  for (const [k, expr] of Object.entries(exprs)) {
    const s = vm.runInContext(`JSON.stringify(${expr} ?? null)`, ctx);
    out[k] = typeof s === 'string' ? JSON.parse(s) : null;
  }
  return out;
}

const enc = encodeURIComponent;
const perChar = (name, file) => getText(`${BASE}/data/characters/${enc(name)}/${file}.js`);

function splitElements(raw) {
  if (!raw) return [];
  return Object.keys(ELEMENT).filter((k) => raw.includes(k)).map((k) => ELEMENT[k]);
}

function parseRotation(value) {
  // "1 › 2↺+3 › 1" -> [["1"], ["2↺","3"], ["1"]]
  return value.split('›').map((step) => step.trim().split('+').map((s) => s.trim()).filter(Boolean));
}

async function readPrev() {
  try { return JSON.parse(await fs.readFile(OUT, 'utf8')); } catch { return null; }
}

async function main() {
  const prev = await readPrev();
  const prevById = new Map((prev?.units || []).map((u) => [u.id, u]));
  const tagEn = JSON.parse(await fs.readFile(TAGS, 'utf8'));

  const glb = evalData(await getText(`${BASE}/data/character_info_glb.js`), {
    list: 'window.characterList', data: 'window.characterData',
  });
  const kr = evalData(await getText(`${BASE}/data/character_info.js`), { data: 'window.characterData' });
  const main = glb?.list?.mainParty;
  const support = glb?.list?.supportParty || [];
  if (!Array.isArray(main) || !main.length || !kr?.data) {
    console.error('Roster list missing or in an unknown format on lufel.net. Nothing written.');
    process.exit(1);
  }
  const roster = [...main, ...support];
  if (prev && roster.length < prev.units.length * 0.8) {
    console.error(`Roster shrank from ${prev.units.length} to ${roster.length} units. Looks broken; nothing written.`);
    process.exit(1);
  }
  const glbOrder = glb.data || {};
  await fs.mkdir(CARD_DIR, { recursive: true });
  const today = new Date().toISOString().slice(0, 10);

  const units = [];
  for (const id of roster) {
    const info = kr.data[id] || {};
    let files;
    try {
      files = await Promise.all(['party', 'operation', 'skill', 'setting', 'review', 'base_stats'].map((f) => perChar(id, f)));
    } catch (e) {
      if (prevById.has(id)) { warn(`${id}: could not load (${e.message}); kept previous data.`); units.push(prevById.get(id)); continue; }
      warn(`${id}: could not load (${e.message}); added with roster info only.`);
      files = [null, null, null, null, null, null];
    }
    const [party, op, skill, setting, review, stats] = files;
    const P = party && evalData(party, { v: `window.recommendParty[${JSON.stringify(id)}]` })?.v;
    const O = op && evalData(op, { v: `window.operationData[${JSON.stringify(id)}]` })?.v;
    const S = skill && evalData(skill, {
      en: `window.enCharacterSkillsData[${JSON.stringify(id)}]`,
      kr: `window.characterSkillsData[${JSON.stringify(id)}]`,
    });
    const R = review && evalData(review, { v: `window.characterReview[${JSON.stringify(id)}]` })?.v;
    const ST = setting && evalData(setting, { v: `window.characterSetting[${JSON.stringify(id)}]` })?.v;
    const B = stats && evalData(stats, { v: `window.basicStatsData[${JSON.stringify(id)}]` })?.v;

    const skills = {};
    const sk = S?.en && Object.keys(S.en).length > 1 ? S.en : null;
    for (const key of ['skill1', 'skill2', 'skill3', 'skill_highlight', 'skill_support1', 'skill_support2', 'skill_support3', 'skill_passive1', 'skill_passive2']) {
      const s = sk?.[key];
      const k = S?.kr?.[key];
      if (s?.name || k?.name) skills[key] = { name: s?.name || k?.name, desc: s?.description || '', type: TYPE[(s?.type || k?.type || '').replace(/\s/g, '')] || '', sp: k?.sp ?? null };
    }

    const isNavigator = support.includes(id);
    const roleKr = info.position || '';
    units.push({
      id,
      name: (info.name_en || R?.name_en || id).replace(/·/g, ' · '),
      codename: info.codename_en || info.codename || R?.codename || '',
      persona: info.persona_en || '',
      rarity: info.rarity || 5,
      limited: !!info.limit,
      elements: splitElements(info.element),
      role: isNavigator ? 'Navigator' : ROLE[roleKr] || '',
      color: info.color || '#e60012',
      navigator: isNavigator,
      order: glbOrder[id]?.release_order ?? info.release_order ?? 0,
      speed: B?.a0_lv1?.speed ?? null,
      roleDesc: info.role_en || '',
      tags: info.tag_en || '',
      tagsKr: info.tag || '',
      review: R?.review_en || '',
      skills,
      rotations: (O?.basic || []).filter((r) => r.value).map((r) => ({
        label: r.label.replace('의식', 'A'),
        steps: parseRotation(r.value),
      })),
      rotationNotes: (O?.note_en || O?.note || []).filter(Boolean),
      parties: (P?.party || []).map((p) => ({
        members: (p.members || []).filter(Boolean),
        comment: p.comment_en || '',
      })).filter((p) => p.members.length),
      friends: (P?.friends || []).filter((f) => f.name).map((f) => ({ id: f.name, comment: f.comment_en || f.comment || '' })),
      skillPriority: ST?.skill_priority || '',
      added: prevById.has(id) ? prevById.get(id).added ?? null : prev ? today : null,
    });
    const u = units.at(-1);

    const file = cardName(id);
    const card = path.join(CARD_DIR, file);
    u.card = `cards/${file}`;
    try { await fs.access(card); } catch {
      try {
        const res = await fetch(`${BASE}/assets/img/character-cards/${enc(id)}.webp`, { signal: AbortSignal.timeout(30000) });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        await sharp(Buffer.from(await res.arrayBuffer())).resize({ width: 360 }).webp({ quality: 80 }).toFile(card);
      } catch (e) {
        u.card = null;
        warn(`${u.codename || id}: no card art yet (${e.message}).`);
      }
    }

    // Things the site can't translate yet.
    if (!isNavigator && !u.role && id !== '원더') warn(`${u.codename || id}: unknown role "${roleKr}". Add it to ROLE in scripts/scrape-lufel.mjs.`);
    if (!isNavigator && !u.elements.length && info.element) warn(`${u.codename || id}: unknown element "${info.element}". Add it to ELEMENT.`);
    if (!u.codename) warn(`${id}: no English codename on lufel yet.`);
    if (Object.keys(u.skills).length && !Object.values(u.skills).some((s) => s.desc)) warn(`${u.codename || id}: no English skill text yet (skill reading skips it).`);
    for (const t of u.tagsKr.split(',').map((x) => x.trim()).filter(Boolean)) {
      if (!(t in tagEn)) warn(`${u.codename || id}: tag "${t}" has no English mapping in src/data/tags.json.`);
    }
    process.stdout.write(`${id} `);
  }
  // Keep only party/friend references to units that exist on Global
  const ids = new Set(units.map((u) => u.id));
  for (const u of units) {
    u.parties = u.parties.map((p) => ({ ...p, members: p.members.filter((m) => ids.has(m)) }));
    u.friends = u.friends.filter((f) => ids.has(f.id));
  }
  // Remove card files no unit uses any more (old index-based names, removed units).
  const used = new Set(units.map((u) => u.card && path.basename(u.card)).filter(Boolean));
  for (const f of await fs.readdir(CARD_DIR)) if (f.endsWith('.webp') && !used.has(f)) await fs.rm(path.join(CARD_DIR, f));

  // Keep the old timestamp when nothing changed, so the daily run doesn't commit noise.
  const same = prev && JSON.stringify(prev.units) === JSON.stringify(units);
  await fs.mkdir(path.dirname(OUT), { recursive: true });
  await fs.writeFile(OUT, JSON.stringify({ source: 'lufel.net', scraped: same ? prev.scraped : new Date().toISOString(), units }, null, 1));

  const added = units.filter((u) => !prevById.has(u.id));
  const removed = [...prevById.keys()].filter((id) => !units.some((u) => u.id === id));
  const label = (u) => (u.codename ? `${u.codename} (${u.name})` : u.name);
  const lines = [
    `${units.length} units${same ? ', no changes' : ''}.`,
    ...(prev && added.length ? [`New: ${added.map(label).join(', ')}`] : []),
    ...(removed.length ? [`Removed from Global list: ${removed.map((id) => label(prevById.get(id))).join(', ')}`] : []),
    ...warnings.map((w) => `Warning: ${w}`),
  ];
  console.log(`\n${lines.join('\n')}`);
  if (process.env.GITHUB_STEP_SUMMARY) await fs.appendFile(process.env.GITHUB_STEP_SUMMARY, `## lufel.net scrape\n\n${lines.map((l) => `- ${l}`).join('\n')}\n`);
  // Commit subject for the workflow.
  if (process.env.GITHUB_OUTPUT) {
    const subject = prev && added.length ? `Add ${added.map((u) => u.codename || u.name).join(', ')} from lufel.net` : 'Update unit data from lufel.net';
    await fs.appendFile(process.env.GITHUB_OUTPUT, `subject=${subject}\n`);
  }
}

main();
