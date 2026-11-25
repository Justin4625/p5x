// Scrapes Global-server P5X unit data from lufel.net into src/data/units.json
// and downloads card art into public/cards/. Re-run when lufel.net updates:
//   node scripts/scrape-lufel.mjs
// Data files on lufel.net are plain JS (window.x = ...). They run inside a vm
// context whose global has no prototype, and only JSON strings come back out.
import vm from 'node:vm';
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const BASE = 'https://lufel.net';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const CARD_DIR = path.join(ROOT, 'public/cards');
const OUT = path.join(ROOT, 'src/data/units.json');

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

async function getText(url) {
  const res = await fetch(url);
  if (!res.ok) return null;
  const text = await res.text();
  return text.trimStart().startsWith('<') ? null : text; // 404 page is HTML
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

async function main() {
  const glb = evalData(await getText(`${BASE}/data/character_info_glb.js`), {
    list: 'window.characterList', data: 'window.characterData',
  });
  const kr = evalData(await getText(`${BASE}/data/character_info.js`), { data: 'window.characterData' });
  const glbOrder = glb.data;
  const main = glb.list.mainParty;
  const support = glb.list.supportParty;
  await fs.mkdir(CARD_DIR, { recursive: true });

  const units = [];
  for (const id of [...main, ...support]) {
    const info = kr.data[id] || {};
    const [party, op, skill, setting, review, stats] = await Promise.all(
      ['party', 'operation', 'skill', 'setting', 'review', 'base_stats'].map((f) => perChar(id, f)),
    );
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
    });

    const card = path.join(CARD_DIR, `${units.length - 1}.webp`);
    units.at(-1).card = `cards/${units.length - 1}.webp`;
    try { await fs.access(card); } catch {
      const res = await fetch(`${BASE}/assets/img/character-cards/${enc(id)}.webp`);
      if (res.ok) {
        await sharp(Buffer.from(await res.arrayBuffer())).resize({ width: 360 }).webp({ quality: 80 }).toFile(card);
      } else units.at(-1).card = null;
    }
    process.stdout.write(`${id} `);
  }
  // Keep only party/friend references to units that exist on Global
  const ids = new Set(units.map((u) => u.id));
  for (const u of units) {
    u.parties = u.parties.map((p) => ({ ...p, members: p.members.filter((m) => ids.has(m)) }));
    u.friends = u.friends.filter((f) => ids.has(f.id));
  }
  await fs.mkdir(path.dirname(OUT), { recursive: true });
  await fs.writeFile(OUT, JSON.stringify({ source: 'lufel.net', scraped: new Date().toISOString(), units }, null, 1));
  console.log(`\n${units.length} units -> ${OUT}`);
}

main();
