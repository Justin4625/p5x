// Builds 10 layout concepts (static, lightly interactive mockups) into public/concepts/.
// Same Persona 5 style, different page structure. Real units, card art, rotations and lufel partners.
// Run: node scripts/build-concepts.mjs
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const { units } = JSON.parse(fs.readFileSync(path.join(root, 'src/data/units.json'), 'utf8'));
const out = path.join(root, 'public/concepts');
fs.mkdirSync(out, { recursive: true });

const BY = new Map(units.map((u) => [u.id, u]));
const EC = { Physical: '#c9b28a', Gun: '#9aa3ad', Fire: '#ff4d2e', Ice: '#5fd3ff', Electric: '#ffe23d', Wind: '#4ef08f', Psychokinesis: '#ff5cd1', Nuclear: '#30f0d0', Bless: '#fff3a8', Curse: '#b04dff', Almighty: '#ffffff' };
const ES = { Physical: 'PHYS', Gun: 'GUN', Fire: 'FIRE', Ice: 'ICE', Electric: 'ELEC', Wind: 'WIND', Psychokinesis: 'PSY', Nuclear: 'NUKE', Bless: 'BLESS', Curse: 'CURSE', Almighty: 'ALMT' };
const esc = (s = '') => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const img = (u) => (u?.card ? `../${u.card}` : '');
const code = (u) => (u.codename || u.name).split('·')[0];
const variant = (u) => (u.codename || '').split('·')[1] || '';

// ---------- the example crew ----------
const team = ['코토네', '마코토', 'J&C'].map((id) => BY.get(id));
const navi = BY.get('미쿠');
const wonder = BY.get('원더');
const pool = units.filter((u) => u.id !== '원더');
const thieves = pool.filter((u) => !u.navigator);
const inTeam = new Set([...team, navi, wonder].map((u) => u.id));

// Partners lufel lists for the crew = the "fits your crew" picks (real data, simple scoring).
const fit = new Map();
for (const m of team) for (const f of m.friends || []) {
  const u = BY.get(f.id);
  if (!u || inTeam.has(u.id) || u.id === '원더') continue;
  const e = fit.get(u.id) ?? { u, score: 0, why: [] };
  e.score += 3; e.why.push({ with: m, text: f.comment || 'lufel best partner' });
  fit.set(u.id, e);
}
for (const u of thieves) {
  if (inTeam.has(u.id)) continue;
  if (u.elements.some((e) => team.some((t) => t.elements.includes(e)))) {
    const e = fit.get(u.id) ?? { u, score: 0, why: [] };
    e.score += 1; if (!e.why.length) e.why.push({ with: team.find((t) => t.elements.some((x) => u.elements.includes(x))), text: `Same element (${u.elements.join('/')}) as your crew.` });
    fit.set(u.id, e);
  }
}
const ranked = [...fit.values()].filter((x) => !x.u.navigator).sort((a, b) => b.score - a.score);
const best = ranked.slice(0, 4);
const good = ranked.slice(4, 10);
const tierOf = (u) => (best.some((b) => b.u === u) ? 'best' : good.some((g) => g.u === u) ? 'good' : 'none');
const score = 74;

// ---------- turn order ----------
const order = [...team].sort((a, b) => (b.speed ?? 0) - (a.speed ?? 0));
const rot = (u) => (u.rotations.find((r) => !r.with) || u.rotations[0]);
function act(u, tok) {
  const auto = tok.includes('↺');
  const t = tok.replace('↺', '').trim();
  if (/^fatigue$/i.test(t)) return { c: 'FTG', l: 'Fatigue', idle: true };
  if (t === '·' || t === '-' || !t) return { c: '—', l: 'Hold', idle: true };
  if (t === 'HL') return { c: 'HL', l: u.skills.skill_highlight?.name || 'Highlight', hl: true };
  if (t === 'TH') return { c: 'TH', l: 'Theurgy' };
  const m = t.match(/^(\d)/);
  if (m) return { c: `S${m[1]}`, l: u.skills[`skill${m[1]}`]?.name || `Skill ${m[1]}`, auto };
  const KR = { '변신': ['TRANSF', 'Transform'], '강화': ['BOOST', 'Boost'], '코어': ['CORE', 'Core'] };
  if (KR[t]) return { c: KR[t][0], l: KR[t][1], auto };
  return { c: t.replace(/[^\x00-\x7f]/g, '').slice(0, 6) || '?', l: t, auto };
}
const TURNS = 6;
const steps = (u) => Array.from({ length: TURNS }, (_, t) => { const r = rot(u); return r ? r.steps[t % r.steps.length].map((tok) => act(u, tok)) : [{ c: '?', l: 'No guide', idle: true }]; });
const lanes = [...order.map((u) => ({ u, kind: 'thief', s: steps(u) })), { u: wonder, kind: 'wonder', s: Array.from({ length: TURNS }, () => [{ c: 'PERSONA', l: 'Fill gaps', flex: true }]) }, { u: navi, kind: 'navi', s: steps(navi) }];

// ---------- shared bits ----------
const ransom = (text, cls = '') => {
  const kinds = ['a', 'b', 'c', 'd', 'e', 'f'];
  let i = 0;
  return `<span class="ransom ${cls}">${text.split(' ').map((w) => `<span class="rw">${[...w].map((ch) => { const k = kinds[(i * 7 + ch.charCodeAt(0)) % 6]; const rot = ((i * 37) % 11) - 5; i++; return `<span class="r r-${k}" style="--rot:${rot}deg">${esc(ch)}</span>`; }).join('')}</span>`).join('<span class="rg"></span>')}</span>`;
};
const pills = (u) => `${u.elements.map((e) => `<span class="pill" style="--ec:${EC[e]}">${ES[e]}</span>`).join('')}<span class="pill pill-role">${esc(u.navigator ? 'Navigator' : u.role)}</span>`;
const cellHTML = (a) => `<div class="act${a.idle ? ' idle' : ''}${a.hl ? ' hl' : ''}${a.flex ? ' flex' : ''}"><b>${esc(a.c)}${a.auto ? '<i>AUTO</i>' : ''}</b><span>${esc(a.l)}</span></div>`;
const turnTable = (compact = false) => `<div class="tt${compact ? ' tt-c' : ''}" style="--turns:${TURNS}">
  <div class="tt-row tt-top"><div></div>${Array.from({ length: TURNS }, (_, t) => `<div class="tt-t">T${t + 1}</div>`).join('')}</div>
  ${lanes.map((l, i) => `<div class="tt-row" style="--c:${l.kind === 'wonder' ? '#e60012' : l.u.color}">
    <div class="tt-who"><span class="tt-n">${l.kind === 'navi' ? 'NAV' : l.kind === 'wonder' ? '★' : i + 1}</span><img src="${img(l.u)}" alt=""><b>${esc(code(l.u))}</b></div>
    ${l.s.map((st) => `<div class="tt-cell">${st.map(cellHTML).join('')}</div>`).join('')}</div>`).join('')}
</div>`;
const card = (u, extra = '') => `<article class="card t-${tierOf(u)}${inTeam.has(u.id) ? ' picked' : ''}" style="--c:${u.color}">
  <img src="${img(u)}" alt="" loading="lazy">
  ${tierOf(u) !== 'none' ? `<span class="badge">${tierOf(u).toUpperCase()}</span>` : ''}
  ${inTeam.has(u.id) ? '<span class="stamp">IN TEAM</span>' : ''}
  <div class="card-tx"><b>${esc(code(u))}${variant(u) ? `<small>${esc(variant(u))}</small>` : ''}</b><span>${esc(u.name)}</span><div class="pills">${pills(u)}</div></div>${extra}
</article>`;
const why = (x) => x.why.slice(0, 2).map((w) => `<p><b>${esc(code(w.with))}:</b> ${esc(w.text)}</p>`).join('');
const NAV = (n) => `<nav class="cnav"><a href="./">◀ All concepts</a><span>${n} / 10</span>${n > 1 ? `<a href="${n - 1}.html">Prev</a>` : ''}${n < 10 ? `<a href="${n + 1}.html">Next ▶</a>` : ''}</nav>`;

const page = (n, title, body, css = '', js = '') => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${n} · ${esc(title)} · Phantom Roster concepts</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Anton&family=Archivo+Black&family=Bowlby+One&family=DM+Serif+Display:ital@0;1&family=Noto+Sans:wght@500;700;900&family=Rubik+Mono+One&display=swap" rel="stylesheet">
<link rel="stylesheet" href="p5.css"><style>${css}</style></head><body class="c${n}">${NAV(n)}${body}${js ? `<script>${js}</script>` : ''}</body></html>`;

// ---------- shared stylesheet ----------
fs.writeFileSync(path.join(out, 'p5.css'), `
:root{--red:#e60012;--red-hot:#ff1f35;--ink:#0a0a0a;--paper:#f4f1ea;--muted:#a7a29a;--line:rgba(255,255,255,.14);--display:'Anton',Impact,sans-serif;--body:'Noto Sans',system-ui,sans-serif;color-scheme:dark}
*,*::before,*::after{box-sizing:border-box}
html{overflow-x:clip}body{margin:0;background:var(--ink);color:var(--paper);font-family:var(--body);font-weight:500;overflow-x:clip;min-height:100vh}
img{display:block;max-width:100%}a{color:var(--red-hot)}button{font:inherit;color:inherit;cursor:pointer}
::selection{background:var(--red);color:#000}
:focus-visible{outline:3px solid var(--paper);outline-offset:3px}
.cnav{position:fixed;right:12px;bottom:12px;z-index:99;display:flex;gap:6px;align-items:center;background:#000;border:2px solid var(--paper);padding:6px 10px;font:900 11px/1 var(--body);text-transform:uppercase;letter-spacing:.06em;clip-path:polygon(4% 0,100% 0,96% 100%,0 100%)}
.cnav a{color:var(--paper);text-decoration:none;padding:4px 6px}.cnav a:hover{background:var(--red);color:#000}.cnav span{color:var(--muted);padding:0 6px}
.ransom.big{font-size:clamp(26px,3.2vw,40px)}.ransom{display:inline-flex;flex-wrap:wrap;gap:.06em;align-items:center}.rw{display:inline-flex;gap:.06em;white-space:nowrap}.rg{width:.3em}
.r{display:inline-block;padding:.02em .12em .06em;line-height:1;rotate:var(--rot)}
.r-a{background:var(--paper);color:#000;font-family:var(--display)}.r-b{background:#000;color:var(--paper);font-family:'DM Serif Display',serif;border:.05em solid var(--paper)}
.r-c{background:var(--red);color:#000;font-family:'Bowlby One',sans-serif;font-size:.9em}.r-d{color:var(--paper);font-family:'Rubik Mono One',sans-serif;font-size:.78em;background:#000;padding:.1em .14em}
.r-e{background:var(--paper);color:var(--red);font-family:'Archivo Black',sans-serif}.r-f{color:#000;background:var(--red-hot);font-family:'DM Serif Display',serif;font-style:italic}
.h{font-family:var(--display);font-weight:400;letter-spacing:.01em;line-height:1;margin:0}
.h span.hl{background:var(--red);color:#000;padding:0 .14em;display:inline-block;rotate:-3deg;clip-path:polygon(3% 0,100% 6%,97% 100%,0 92%)}
.tag{display:inline-block;font:400 12px/1 var(--display);letter-spacing:.14em;background:#000;color:var(--paper);padding:5px 10px 4px;rotate:-2deg;border:2px solid var(--paper)}
.pill{font-size:9px;font-weight:900;padding:1px 5px;letter-spacing:.05em;text-transform:uppercase;background:var(--ec);color:#111}
.pill-role{background:var(--paper);color:#000}.pills{display:flex;flex-wrap:wrap;gap:3px}
.card{position:relative;aspect-ratio:360/603;isolation:isolate;transition:transform .3s cubic-bezier(.2,1.15,.35,1)}
.card>img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.card-tx{position:absolute;left:-5px;right:14%;bottom:13%;background:#000;padding:4px 7px 5px;rotate:-3deg;box-shadow:3px 3px 0 var(--c)}
.card-tx b{display:block;font:400 16px/1 var(--display);letter-spacing:.03em}.card-tx b small{display:block;font:900 .55em/1.2 var(--body);letter-spacing:.08em;color:var(--red-hot);text-transform:uppercase}
.card-tx>span{display:block;font-size:10px;color:#cfc9bf;font-weight:700;margin:2px 0 3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.card .badge{position:absolute;top:-8px;left:-8px;z-index:3;font:400 13px/1 var(--display);padding:12px 8px;background:var(--red);color:#fff;rotate:-12deg;clip-path:polygon(50% 0,61% 22%,85% 12%,78% 36%,100% 50%,78% 64%,85% 88%,61% 78%,50% 100%,39% 78%,15% 88%,22% 64%,0 50%,22% 36%,15% 12%,39% 22%)}
.card.t-good .badge{background:var(--paper);color:#000;scale:.85}
.card.t-best::after{content:'';position:absolute;inset:-4px;z-index:-1;background:var(--red);clip-path:polygon(4% 0,100% 2%,96% 100%,0 97%)}
.card.t-good::after{content:'';position:absolute;inset:-3px;z-index:-1;background:var(--paper);opacity:.75;clip-path:polygon(4% 0,100% 2%,96% 100%,0 97%)}
.card.t-none{filter:grayscale(.9) brightness(.45)}
.card.picked{filter:none}.card.picked>img{filter:brightness(.55)}
.stamp{position:absolute;top:36%;left:50%;translate:-50% 0;rotate:-18deg;z-index:2;font:400 20px/1 var(--display);color:var(--red);border:4px solid var(--red);padding:3px 8px 0;background:rgba(0,0,0,.75);white-space:nowrap}
@media(hover:hover){.card:hover{transform:translateY(-5px) rotate(-1.5deg);filter:none;z-index:4}}
.tt{display:grid;gap:5px;overflow-x:auto;padding-bottom:4px}
.tt-row{display:grid;grid-template-columns:130px repeat(var(--turns),minmax(62px,1fr));gap:4px;min-width:calc(130px + var(--turns)*66px)}
.tt-t{font:400 14px/1 var(--display);text-align:center;background:#000;border-bottom:3px solid var(--red);padding:4px 0 2px}
.tt-who{position:sticky;left:0;z-index:2;display:grid;grid-template-columns:22px 32px 1fr;gap:6px;align-items:center;background:#000;border-left:5px solid var(--c);padding:4px}
.tt-who img{width:32px;height:32px;object-fit:cover;object-position:50% 14%;scale:1;clip-path:polygon(15% 0,100% 0,85% 100%,0 100%)}
.tt-who b{font:400 13px/1 var(--display);letter-spacing:.03em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.tt-n{font:400 18px/1 var(--display);color:var(--c);text-align:center}
.tt-cell{display:flex;flex-direction:column;gap:3px}
.act{flex:1;min-height:42px;background:var(--paper);color:#000;padding:4px 6px;clip-path:polygon(6% 0,100% 0,94% 100%,0 100%);display:flex;flex-direction:column;justify-content:center}
.act b{font:400 16px/1 var(--display);display:flex;gap:4px;align-items:center}.act b i{font:900 8px/1 var(--body);font-style:normal;background:var(--red);color:#fff;padding:1px 3px}
.act span{font-size:9px;font-weight:700;line-height:1.15;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.act.idle{background:#2a2a2a;color:var(--muted)}.act.hl{background:var(--red)}.act.flex{background:repeating-linear-gradient(-55deg,#1d1d1d 0 8px,#262626 8px 16px);color:var(--paper)}.act.flex b{color:var(--red-hot);font-size:13px}
.chip{border:0;background:#1c1c1c;font:900 11px/1 var(--body);letter-spacing:.06em;padding:7px 9px;text-transform:uppercase;color:var(--ec,var(--paper));clip-path:polygon(8% 0,100% 0,92% 100%,0 100%)}
.chip.on{background:var(--ec,var(--paper));color:#000;rotate:-3deg}
.btn{border:2px solid var(--paper);background:#000;padding:8px 16px 6px;font:400 15px/1 var(--display);letter-spacing:.08em;clip-path:polygon(4% 0,100% 0,96% 100%,0 100%)}
.btn-red{background:var(--red);color:#000;border-color:#000}
.meter{display:flex;align-items:center;gap:12px}.meter-n{font:400 52px/.9 var(--display);background:var(--paper);color:#000;padding:4px 10px 0;rotate:-4deg;box-shadow:5px 5px 0 var(--red)}
.meter-l{font:900 italic 13px/1.15 var(--body);text-transform:uppercase}
.slash-bg{position:fixed;inset:0;z-index:-1;pointer-events:none;background:linear-gradient(170deg,var(--red) 0 16%,transparent 16.1%)}
@media(prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}}
`);

// ---------- the ten concepts ----------
const C = [];
const top = thieves.filter((u) => !inTeam.has(u.id)).sort((a, b) => b.order - a.order);
const gridUnits = [...team, ...best.map((x) => x.u), ...good.map((x) => x.u), ...top].filter((u, i, a) => a.indexOf(u) === i).slice(0, 24);

// 1 Command Deck
C.push({ name: 'Command Deck', note: 'Three columns: filter rail left, roster centre, crew + turn order docked right. Everything on one screen, built for desktop.',
  css: `
.deck{display:grid;grid-template-columns:150px minmax(0,1fr) 460px;gap:20px;padding:16px;min-height:100vh}
.rail{position:sticky;top:16px;align-self:start;display:grid;gap:4px}
.rail .logo{font:400 26px/0.95 var(--display);margin-bottom:14px}.rail .logo span{color:var(--red)}
.rail h4{margin:14px 0 4px;font:900 10px/1 var(--body);letter-spacing:.14em;color:var(--muted)}
.rail .chip{display:block;width:100%;text-align:left;clip-path:polygon(0 0,100% 0,94% 100%,0 100%)}
.mid h1{font:400 44px/1 var(--display);margin:0 0 12px}.mid h1 span{background:var(--red);color:#000;padding:0 8px;display:inline-block;rotate:-2deg}
.mid input{width:100%;background:#000;border:2px solid var(--paper);color:var(--paper);padding:10px 14px;font:inherit;font-weight:700;margin-bottom:16px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:16px 12px}
.dock{position:sticky;top:16px;align-self:start;background:#111;border:2px solid var(--paper);box-shadow:8px 8px 0 var(--red);padding:16px;max-height:calc(100vh - 32px);overflow:auto}
.slots{display:grid;grid-template-columns:repeat(5,1fr);gap:6px;margin:12px 0}
.slot{aspect-ratio:3/4.2;position:relative;overflow:hidden;clip-path:polygon(8% 0,100% 0,92% 100%,0 100%)}.slot img{width:100%;height:100%;object-fit:cover;object-position:50% 12%}
.slot b{position:absolute;left:8%;bottom:6px;font:400 13px/1 var(--display);text-shadow:0 1px 4px #000}
@media(max-width:1100px){.deck{grid-template-columns:1fr}.rail,.dock{position:static}.rail{grid-template-columns:repeat(auto-fill,minmax(90px,1fr))}.rail .logo,.rail h4{grid-column:1/-1}}`,
  body: `<div class="deck">
  <aside class="rail"><div class="logo">PHANTOM<br><span>ROSTER</span></div>
    <h4>ELEMENT</h4>${Object.keys(ES).map((e, i) => `<button class="chip${i === 2 ? ' on' : ''}" style="--ec:${EC[e]}">${ES[e]}</button>`).join('')}
    <h4>ROLE</h4>${['Sweeper', 'Assassin', 'Strategist', 'Saboteur', 'Guardian', 'Medic'].map((r) => `<button class="chip">${r}</button>`).join('')}
  </aside>
  <main class="mid"><h1><span>GLOBAL</span> UNITS 57</h1><input placeholder="Search name, codename, persona…"><div class="grid">${gridUnits.map((u) => card(u)).join('')}</div></main>
  <aside class="dock"><div class="h" style="font-size:30px"><span class="hl">CREW</span> & TURNS</div>
    <div class="slots">${[...team, wonder, navi].map((u) => `<div class="slot" style="background:${u.color}"><img src="${img(u)}" alt=""><b>${esc(code(u))}</b></div>`).join('')}</div>
    <div class="meter"><span class="meter-n">${score}</span><span class="meter-l">Solid<br>crew</span></div><div style="height:16px"></div>${turnTable(true)}</aside>
</div>` });

// 2 Phantom Stage
C.push({ name: 'Phantom Stage', note: 'Your crew is the hero: three giant slanted portraits fill the top. Fits, turn order and roster scroll underneath.',
  css: `
.stage{display:grid;grid-template-columns:1fr 1fr 1fr .55fr .55fr;height:min(72vh,640px);gap:0;margin-top:0}
.pane{position:relative;overflow:hidden;margin-right:-4vw;clip-path:polygon(18% 0,100% 0,82% 100%,0 100%);background:var(--c)}
.pane img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:50% 10%}
.pane::after{content:'';position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,.92),transparent 50%)}
.pane .tx{position:absolute;z-index:2;left:22%;bottom:5%;right:12%}.pane .tx b{display:block;font:400 clamp(28px,4.4vw,70px)/.9 var(--display)}
.pane .n{position:absolute;z-index:2;top:16px;left:24%;font:400 clamp(30px,5vw,80px)/1 var(--display);color:transparent;-webkit-text-stroke:2px var(--paper)}
.pane.small .tx b{font-size:clamp(18px,2vw,30px)}.pane.small .n{font-size:28px}
.bar{display:flex;flex-wrap:wrap;gap:20px;align-items:center;justify-content:space-between;padding:22px 5vw;background:#000;border-top:4px solid var(--red);border-bottom:4px solid var(--red)}
.sec{padding:28px 5vw}.sec h2{font:400 40px/1 var(--display);margin:0 0 16px}.sec h2 span{background:var(--red);color:#000;padding:0 8px;display:inline-block;rotate:-2deg}
.strip{display:grid;grid-auto-flow:column;grid-auto-columns:minmax(150px,170px);gap:16px;overflow-x:auto;padding:8px 4px 16px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:14px 10px}
@media(max-width:800px){.stage{grid-template-columns:1fr 1fr 1fr;height:auto}.pane{aspect-ratio:3/5}.pane.small{display:none}}`,
  body: `<section class="stage">${[...team, wonder, navi].map((u, i) => `<div class="pane${i > 2 ? ' small' : ''}" style="--c:${u.color}"><img src="${img(u)}" alt=""><span class="n">${i < 3 ? `0${i + 1}` : i === 3 ? '★' : 'NAV'}</span><div class="tx"><b>${esc(code(u))}</b><div class="pills">${pills(u)}</div></div></div>`).join('')}</section>
<div class="bar"><div>${ransom('PHANTOM ROSTER', 'big')}</div><div class="meter"><span class="meter-n">${score}</span><span class="meter-l">Solid crew</span></div><button class="btn btn-red">CHANGE CREW</button></div>
<section class="sec"><h2><span>FITS</span> YOUR CREW</h2><div class="strip">${[...best, ...good].map((x) => card(x.u)).join('')}</div></section>
<section class="sec"><h2><span>TURN</span> ORDER</h2>${turnTable()}</section>
<section class="sec"><h2><span>ALL</span> UNITS</h2><div class="grid">${gridUnits.map((u) => card(u)).join('')}</div></section>` });

// 3 Heist Plan (wizard)
C.push({ name: 'Heist Plan', note: 'A step-by-step plan: 1 thieves, 2 navigator, 3 turn order, 4 calling card. One decision per screen; great on phones.',
  css: `
.steps{display:grid;grid-template-columns:repeat(4,1fr);gap:0;background:#000;border-bottom:4px solid var(--red);position:sticky;top:0;z-index:5}
.steps button{border:0;background:transparent;padding:14px 10px 10px;text-align:left;color:var(--muted);font:400 16px/1 var(--display);letter-spacing:.04em;clip-path:polygon(0 0,100% 0,92% 100%,0 100%)}
.steps button b{display:block;font-size:34px;color:inherit}.steps button.on{background:var(--red);color:#000}
.panel{display:none;padding:30px 5vw 80px}.panel.on{display:block}
.panel h2{font:400 clamp(40px,6vw,76px)/1 var(--display);margin:0 0 6px}.panel p.lead{font-weight:700;color:#cfc9bf;margin:0 0 22px;max-width:60ch}
.pick{display:grid;grid-template-columns:repeat(3,minmax(0,220px));gap:18px;margin-bottom:28px}
.pick .stamp{display:none}.pick .card.picked>img{filter:none}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:14px 10px}
.card-why{background:var(--paper);color:#000;padding:6px 8px;font-size:11px;font-weight:700;margin-top:6px;clip-path:polygon(0 0,100% 0,97% 100%,2% 100%)}
.card-why b{color:var(--red);font-family:var(--display);font-weight:400}
.cc{max-width:560px;background:var(--paper);color:#000;padding:28px;rotate:-1.5deg;box-shadow:10px 10px 0 var(--red)}
.cc h3{font:400 40px/1 var(--display);margin:0 0 10px}.cc li{font-weight:700;margin:4px 0}
.next{margin-top:26px}`,
  body: `<div class="steps">${['THIEVES', 'NAVIGATOR', 'TURN ORDER', 'CALLING CARD'].map((s, i) => `<button data-s="${i}" class="${i === 0 ? 'on' : ''}"><b>0${i + 1}</b>${s}</button>`).join('')}</div>
<section class="panel on" data-p="0"><h2>${ransom('PICK 3 THIEVES')}</h2><p class="lead">Wonder is always in. Pick three; the units that fit light up as you go.</p>
  <div class="pick">${team.map((u) => card(u)).join('')}</div>
  <h3 class="h" style="font-size:28px;margin-bottom:12px"><span class="hl">FITS</span> SO FAR</h3><div class="grid">${[...best, ...good].slice(0, 8).map((x) => `<div>${card(x.u)}<div class="card-why">${why(x)}</div></div>`).join('')}</div>
  <button class="btn btn-red next" data-go="1">NEXT: NAVIGATOR ▶</button></section>
<section class="panel" data-p="1"><h2>${ransom('NAVIGATOR')}</h2><p class="lead">Optional. Navigators are ranked on how they back up your three thieves.</p>
  <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(150px,1fr))">${pool.filter((u) => u.navigator).map((u) => card(u)).join('')}</div><button class="btn btn-red next" data-go="2">NEXT: TURN ORDER ▶</button></section>
<section class="panel" data-p="2"><h2>${ransom('TURN ORDER')}</h2><p class="lead">Action order follows base Speed. Tap a move for the skill text.</p>${turnTable()}<button class="btn btn-red next" data-go="3">NEXT: CALLING CARD ▶</button></section>
<section class="panel" data-p="3"><h2>${ransom('TAKE YOUR TIME')}</h2><div class="cc"><h3>THE CREW</h3><ul>${[...team, navi].map((u) => `<li>${esc(code(u))} — ${esc(u.name)}</li>`).join('')}</ul><div class="meter" style="margin-top:16px"><span class="meter-n">${score}</span><span class="meter-l">Solid crew</span></div></div><div class="next"><button class="btn">COPY SHARE LINK</button></div></section>`,
  js: `const show=i=>{document.querySelectorAll('.steps button').forEach((b,j)=>b.classList.toggle('on',j==i));document.querySelectorAll('.panel').forEach((p,j)=>p.classList.toggle('on',j==i));scrollTo(0,0)};document.addEventListener('click',e=>{const s=e.target.closest('[data-s],[data-go]');if(s)show(s.dataset.s??s.dataset.go)})` });

// 4 Timeline
C.push({ name: 'Battle Timeline', note: 'The turn order is the page. Big turn columns, each unit\'s move as a card; crew picker in a bar, roster in a pull-out.',
  css: `
.topbar{display:flex;flex-wrap:wrap;align-items:center;gap:14px;padding:14px 4vw;background:#000;border-bottom:4px solid var(--red);position:sticky;top:0;z-index:5}
.topbar .who{display:flex;gap:8px}.topbar .who span{display:flex;align-items:center;gap:6px;background:#1a1a1a;padding:4px 10px 4px 4px;font:400 15px/1 var(--display);clip-path:polygon(0 0,100% 0,94% 100%,0 100%);border-left:4px solid var(--c)}
.topbar .who img{width:30px;height:30px;object-fit:cover;object-position:50% 12%}
.topbar .sp{flex:1}
.tl{display:grid;grid-template-columns:repeat(${TURNS},minmax(170px,1fr));gap:12px;padding:26px 4vw 90px;overflow-x:auto}
.turn{background:#111;border-top:6px solid var(--red);padding:10px;display:grid;align-content:start;gap:8px;clip-path:polygon(0 0,100% 0,100% 100%,0 98%)}
.turn h3{margin:0 0 4px;font:400 54px/.9 var(--display);color:transparent;-webkit-text-stroke:2px var(--paper)}
.mv{display:grid;grid-template-columns:34px 1fr;gap:8px;align-items:center;background:var(--paper);color:#000;padding:6px;border-left:6px solid var(--c);clip-path:polygon(0 0,100% 0,96% 100%,0 100%)}
.mv img{width:34px;height:34px;object-fit:cover;object-position:50% 12%}
.mv b{font:400 20px/1 var(--display)}.mv span{display:block;font-size:10px;font-weight:700}
.mv.idle{background:#2a2a2a;color:var(--muted)}.mv.flex{background:#1d1d1d;color:var(--paper)}.mv.hl{background:var(--red)}`,
  body: `<div class="topbar">${ransom('BATTLE PLAN', 'big')}<div class="who">${[...team, navi].map((u) => `<span style="--c:${u.color}"><img src="${img(u)}" alt="">${esc(code(u))}</span>`).join('')}</div><span class="sp"></span><div class="meter"><span class="meter-n" style="font-size:36px">${score}</span></div><button class="btn btn-red">ROSTER ▸</button></div>
<div class="tl">${Array.from({ length: TURNS }, (_, t) => `<section class="turn"><h3>T${t + 1}</h3>${lanes.map((l) => l.s[t].map((a) => `<div class="mv${a.idle ? ' idle' : ''}${a.flex ? ' flex' : ''}${a.hl ? ' hl' : ''}" style="--c:${l.kind === 'wonder' ? '#e60012' : l.u.color}"><img src="${img(l.u)}" alt=""><div><b>${esc(a.c)}</b><span>${esc(code(l.u))} · ${esc(a.l)}</span></div></div>`).join('')).join('')}</section>`).join('')}</div>` });

// 5 Dossier table
C.push({ name: 'Dossier', note: 'The roster as a sortable data table, like a case file: element, role, speed, tier, fit. Crew docked at the bottom.',
  css: `
.wrap{padding:26px 4vw 160px}
.wrap h1{font:400 clamp(40px,6vw,72px)/1 var(--display);margin:0 0 18px}
.tbl{width:100%;border-collapse:separate;border-spacing:0 6px;font-size:13px}
.tbl th{text-align:left;font:900 10px/1 var(--body);letter-spacing:.14em;color:var(--muted);padding:6px 10px;cursor:pointer}
.tbl th.on{color:var(--paper)}.tbl th.on::after{content:' ▼';color:var(--red)}
.tbl td{background:#111;padding:6px 10px;font-weight:700;vertical-align:middle}
.tbl tr td:first-child{border-left:5px solid var(--c);padding-left:6px}
.tbl tr.best td{background:linear-gradient(90deg,#2a0005,#111 40%)}
.tbl .u{display:flex;align-items:center;gap:10px}.tbl .u img{width:44px;height:44px;object-fit:cover;object-position:50% 12%;clip-path:polygon(12% 0,100% 0,88% 100%,0 100%)}
.tbl .u b{font:400 18px/1 var(--display);display:block}.tbl .u span{font-size:11px;color:#cfc9bf}
.fit{display:flex;align-items:center;gap:8px}.fit i{display:block;height:10px;width:90px;background:#262626}.fit i::before{content:'';display:block;height:100%;width:var(--w);background:var(--red)}
.add{border:2px solid var(--paper);background:#000;padding:4px 10px;font:400 13px/1 var(--display)}
.tbl tr.in td{opacity:.5}
.dock{position:fixed;left:0;right:0;bottom:0;z-index:20;background:#000;border-top:4px solid var(--red);display:flex;align-items:center;gap:14px;padding:10px 4vw;flex-wrap:wrap}
.dock .s{display:flex;align-items:center;gap:8px;font:400 18px/1 var(--display)}.dock .s img{width:48px;height:48px;object-fit:cover;object-position:50% 12%;border:2px solid var(--c)}
@media(max-width:760px){.tbl .hide{display:none}}`,
  body: `<div class="wrap"><h1>${ransom('CASE FILES')}</h1>
<table class="tbl"><thead><tr><th>UNIT</th><th>ELEMENT</th><th class="hide">ROLE</th><th class="hide">SPEED</th><th>TIER</th><th class="on">FIT</th><th></th></tr></thead><tbody>
${[...team.map((u) => ({ u, score: 0, in: 1 })), ...best, ...good, ...top.slice(0, 10).map((u) => ({ u, score: 0 }))].filter((x, i, a) => a.findIndex((y) => y.u === x.u) === i).map((x) => `<tr class="${tierOf(x.u) === 'best' ? 'best' : ''}${x.in ? ' in' : ''}" style="--c:${x.u.color}"><td><div class="u"><img src="${img(x.u)}" alt=""><div><b>${esc(code(x.u))}</b><span>${esc(x.u.name)}</span></div></div></td><td><div class="pills">${x.u.elements.map((e) => `<span class="pill" style="--ec:${EC[e]}">${ES[e]}</span>`).join('')}</div></td><td class="hide">${esc(x.u.role)}</td><td class="hide">${x.u.speed ?? '—'}</td><td>${esc(x.u.tier?.label || '—')}</td><td><div class="fit"><i style="--w:${Math.min(100, x.score * 14)}%"></i>${x.in ? 'IN CREW' : tierOf(x.u) === 'none' ? '' : tierOf(x.u).toUpperCase()}</div></td><td>${x.in ? '' : '<button class="add">+ ADD</button>'}</td></tr>`).join('')}
</tbody></table></div>
<div class="dock">${[...team, navi].map((u) => `<span class="s" style="--c:${u.color}"><img src="${img(u)}" alt="">${esc(code(u))}</span>`).join('')}<span style="flex:1"></span><div class="meter"><span class="meter-n" style="font-size:34px">${score}</span><span class="meter-l">Solid crew</span></div><button class="btn btn-red">TURN ORDER</button></div>` });

// 6 Hand of cards
C.push({ name: 'Hand of Cards', note: 'Like a card game: your crew lies on the table, candidates fan out as your hand at the bottom. Mobile-first.',
  css: `
body{background:radial-gradient(120% 80% at 50% 0,#3a0008,#0a0a0a 60%)}
.table{min-height:100vh;display:grid;grid-template-rows:auto 1fr auto;gap:10px;padding:16px 4vw 0}
.head{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}
.felt{display:grid;grid-template-columns:repeat(5,minmax(0,170px));justify-content:center;gap:clamp(8px,2vw,22px);align-items:end;padding:20px 0}
.felt .card:nth-child(1){rotate:-6deg}.felt .card:nth-child(2){rotate:-2deg;translate:0 -14px}.felt .card:nth-child(3){rotate:3deg}.felt .card:nth-child(4){rotate:6deg;scale:.85}.felt .card:nth-child(5){rotate:9deg;scale:.85}
.felt .card.picked>img{filter:none}.felt .stamp{display:none}
.mid{display:flex;justify-content:center;gap:16px;align-items:center;flex-wrap:wrap}
.hand{position:sticky;bottom:0;display:flex;justify-content:center;padding:30px 0 0;height:230px;overflow:visible}
.hand .card{width:130px;margin:0 -34px;transform-origin:50% 140%;rotate:calc((var(--i) - 4) * 6deg);translate:0 calc(abs(var(--i) - 4) * 8px)}
.hand .card:hover{translate:0 -60px;rotate:0deg;z-index:9}
@media(max-width:640px){.felt{grid-template-columns:repeat(3,1fr)}.felt .card:nth-child(n+4){display:none}.hand .card{width:96px;margin:0 -30px}}`,
  body: `<div class="table"><div class="head">${ransom('YOUR TABLE', 'big')}<div class="meter"><span class="meter-n">${score}</span><span class="meter-l">Solid<br>crew</span></div></div>
<div class="felt">${[...team, wonder, navi].map((u) => card(u)).join('')}</div>
<div class="mid"><button class="btn">TURN ORDER</button><button class="btn btn-red">DRAW: BEST FITS</button></div>
<div class="hand">${[...best, ...good].slice(0, 9).map((x, i) => card(x.u).replace('<article class="card', `<article style="--i:${i}" class="card`)).join('')}</div></div>` });

// 7 Pause menu (master/detail)
const focus = best[0]?.u || top[0];
C.push({ name: 'Pause Menu', note: 'A huge slanted menu of names on the left, the selected unit up close on the right with skills, partners and Add to crew.',
  css: `
.pm{display:grid;grid-template-columns:minmax(280px,38%) 1fr;min-height:100vh}
.menu{padding:30px 0 80px 3vw;display:grid;align-content:start;gap:2px;background:linear-gradient(100deg,#000 60%,transparent)}
.menu a{display:block;font:400 clamp(26px,3.2vw,46px)/1 var(--display);color:var(--paper);text-decoration:none;padding:4px 18px 2px;width:max-content;max-width:100%;clip-path:polygon(0 0,100% 0,95% 100%,0 100%);transition:background .2s,translate .2s}
.menu a small{font:900 11px/1 var(--body);letter-spacing:.1em;color:var(--muted);margin-left:10px}
.menu a:nth-child(odd){translate:18px 0}.menu a:hover,.menu a.on{background:var(--red);color:#000;translate:36px 0;rotate:-2deg}
.menu a.on small{color:#000}
.detail{position:relative;padding:30px 4vw 80px;overflow:hidden}
.detail .art{position:absolute;right:-4vw;top:0;height:100%;width:60%;object-fit:cover;object-position:50% 10%;opacity:.9;clip-path:polygon(22% 0,100% 0,100% 100%,0 100%);mask-image:linear-gradient(90deg,transparent,#000 30%)}
.detail .in{position:relative;max-width:520px}
.detail h2{font:400 clamp(60px,8vw,120px)/.85 var(--display);margin:0}.detail .nm{font-weight:900;color:#cfc9bf;margin:6px 0 10px}
.box{background:#000;border:2px solid var(--paper);padding:14px;margin-top:16px;box-shadow:6px 6px 0 var(--red)}
.box h4{margin:0 0 8px;font:400 18px/1 var(--display);letter-spacing:.06em;color:var(--red-hot)}.box p{margin:4px 0;font-size:13px;line-height:1.45}
@media(max-width:760px){.pm{grid-template-columns:1fr}.detail .art{width:100%;opacity:.25}}`,
  body: `<div class="pm"><nav class="menu">${[...best, ...good].map((x) => x.u).concat(top.slice(0, 6)).filter((u, i, a) => a.indexOf(u) === i).slice(0, 14).map((u) => `<a href="#" class="${u === focus ? 'on' : ''}">${esc(code(u))}<small>${esc(u.role)}</small></a>`).join('')}</nav>
<section class="detail"><img class="art" src="${img(focus)}" alt=""><div class="in"><span class="tag">BEST FIT FOR YOUR CREW</span><h2>${esc(code(focus))}</h2><div class="nm">${esc(focus.name)}</div><div class="pills">${pills(focus)}</div>
<div class="box"><h4>WHY IT FITS</h4>${why(best[0] || { why: [] })}</div>
<div class="box"><h4>SKILLS</h4>${['skill1', 'skill2', 'skill3'].map((k) => focus.skills[k] ? `<p><b>${esc(focus.skills[k].name)}</b></p>` : '').join('')}</div>
<div style="margin-top:18px;display:flex;gap:10px"><button class="btn btn-red">ADD TO CREW</button><button class="btn">DETAILS</button></div></div></section></div>` });

// 8 Bento HQ
C.push({ name: 'Hideout HQ', note: 'A dashboard of tiles: crew, score, roles covered, turn order, best fits and what\'s on the banner, all at a glance.',
  css: `
.bento{display:grid;grid-template-columns:repeat(12,1fr);grid-auto-rows:minmax(90px,auto);gap:14px;padding:18px 3vw 80px}
.t{background:#111;border:2px solid var(--line);padding:14px;position:relative;overflow:hidden;clip-path:polygon(0 0,calc(100% - 18px) 0,100% 18px,100% 100%,0 100%)}
.t h3{margin:0 0 10px;font:400 22px/1 var(--display);letter-spacing:.04em}.t h3 span{background:var(--red);color:#000;padding:0 6px;display:inline-block;rotate:-2deg}
.t-hero{grid-column:span 7;grid-row:span 3;padding:0;border:0}.t-hero img{position:absolute;inset:0;height:100%;width:33.4%;object-fit:cover;object-position:50% 10%}
.t-hero img:nth-child(2){left:33.3%}.t-hero img:nth-child(3){left:66.6%}
.t-hero::after{content:'';position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,.9),transparent 45%)}
.t-hero .tx{position:absolute;z-index:2;left:16px;bottom:14px}
.t-score{grid-column:span 2;grid-row:span 2;background:var(--paper);color:#000;display:grid;place-content:center;text-align:center;border:0}
.t-score b{font:400 90px/.85 var(--display)}.t-score span{font:900 12px/1 var(--body);letter-spacing:.1em}
.t-roles{grid-column:span 3;grid-row:span 2}.t-roles li{list-style:none;font:900 12px/1 var(--body);letter-spacing:.08em;padding:6px 0;border-bottom:1px solid var(--line)}.t-roles ul{margin:0;padding:0}
.t-roles li.ok::before{content:'★ ';color:var(--red)}.t-roles li.no{color:var(--muted)}.t-roles li.no::before{content:'✕ '}
.t-ban{grid-column:span 5;grid-row:span 1;background:var(--red);color:#000;border:0;display:flex;align-items:center;gap:12px}.t-ban b{font:400 26px/1 var(--display)}
.t-turn{grid-column:span 12}
.t-fit{grid-column:span 12}.t-fit .row{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:12px}
@media(max-width:900px){.bento>*{grid-column:1/-1!important}.t-hero{min-height:360px}}`,
  body: `<div style="padding:18px 3vw 0">${ransom('HIDEOUT HQ', 'big')}</div><div class="bento">
<div class="t t-hero">${team.map((u) => `<img src="${img(u)}" alt="">`).join('')}<div class="tx"><span class="tag">YOUR CREW</span><div class="h" style="font-size:40px;margin-top:6px">${team.map(code).join(' · ')}</div></div></div>
<div class="t t-score"><b>${score}</b><span>CREW SCORE</span></div>
<div class="t t-roles"><h3><span>ROLES</span></h3><ul><li class="ok">DAMAGE</li><li class="ok">SUPPORT</li><li class="no">SUSTAIN</li><li class="ok">NAVIGATOR</li></ul></div>
<div class="t t-ban"><span class="tag">ON BANNER</span><b>FUUKA · until 26 Nov</b></div>
<div class="t t-turn"><h3><span>TURN</span> ORDER</h3>${turnTable(true)}</div>
<div class="t t-fit"><h3><span>BEST</span> FITS</h3><div class="row">${[...best, ...good].slice(0, 8).map((x) => card(x.u)).join('')}</div></div></div>` });

// 9 Calling Card newspaper
C.push({ name: 'Calling Card', note: 'An editorial page on paper: your crew as the front-page story, analysis in columns, the turn order as a printed schedule.',
  css: `
body{background:#e9e3d6;color:#111}
.paper{max-width:1180px;margin:0 auto;padding:30px 4vw 90px}
.mast{display:flex;justify-content:space-between;align-items:end;border-bottom:4px solid #111;padding-bottom:10px;flex-wrap:wrap;gap:10px}
.mast .d{font:900 11px/1.4 var(--body);letter-spacing:.14em;text-transform:uppercase}
.lead{display:grid;grid-template-columns:1.25fr 1fr;gap:28px;margin-top:22px}
.lead h1{font:400 clamp(48px,7vw,104px)/.9 var(--display);margin:0;color:#111}.lead h1 em{font-style:normal;color:var(--red)}
.lead .dek{font:italic 400 20px/1.35 'DM Serif Display',serif;margin:12px 0 0}
.trio{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.trio img{aspect-ratio:3/4.4;object-fit:cover;object-position:50% 10%;width:100%;filter:contrast(1.05);clip-path:polygon(6% 0,100% 0,94% 100%,0 100%)}
.cols{columns:3 240px;column-gap:28px;margin-top:26px;border-top:1px solid #111;padding-top:16px;font-size:14px;line-height:1.55}
.cols h3{font:400 22px/1 var(--display);margin:0 0 6px;break-after:avoid}.cols p{margin:0 0 12px}.cols b{color:var(--red)}
.sched{margin-top:26px;border-top:4px double #111;padding-top:12px}
.sched .tt-who,.sched .tt-t{background:#111;color:#f4f1ea}
.stampy{display:inline-block;border:4px solid var(--red);color:var(--red);font:400 30px/1 var(--display);padding:6px 12px 2px;rotate:-8deg}
@media(max-width:800px){.lead{grid-template-columns:1fr}}`,
  body: `<div class="paper"><div class="mast">${ransom('THE PHANTOM TIMES', 'big')}<div class="d">Global edition · ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</div></div>
<div class="lead"><div><h1>KOTONE CREW <em>STRIKES</em> AT ${score}</h1><p class="dek">Queen and J&C join Kotone; Miku navigates. Analysts call it a solid crew, light on sustain.</p><div style="margin-top:16px"><span class="stampy">SOLID CREW</span></div></div><div class="trio">${team.map((u) => `<img src="${img(u)}" alt="">`).join('')}</div></div>
<div class="cols">${best.map((x) => `<h3>${esc(code(x.u))} WANTED</h3><p>${esc(x.why[0]?.text || '')} <b>Best fit.</b></p>`).join('')}${good.slice(0, 3).map((x) => `<h3>${esc(code(x.u))}</h3><p>${esc(x.why[0]?.text || '')}</p>`).join('')}</div>
<div class="sched"><h3 class="h" style="font-size:30px;margin-bottom:10px">TODAY'S SCHEDULE</h3>${turnTable(true)}</div></div>` });

// 10 Versus split
C.push({ name: 'Versus', note: 'A diagonal split: your crew on the red side, ranked candidates on the black side with the reasons written out (no hover needed).',
  css: `
.vs{display:grid;grid-template-columns:42% 58%;min-height:100vh}
.left{background:var(--red);color:#000;padding:28px 6vw 80px 3vw;clip-path:polygon(0 0,100% 0,86% 100%,0 100%);position:relative;z-index:1}
.left h2{font:400 clamp(44px,5vw,80px)/.9 var(--display);margin:0 0 16px}
.mem{display:grid;grid-template-columns:90px 1fr;gap:12px;align-items:center;background:#000;color:var(--paper);padding:8px;margin-bottom:10px;clip-path:polygon(0 0,100% 0,95% 100%,0 100%);max-width:86%}
.mem img{width:90px;height:90px;object-fit:cover;object-position:50% 12%}.mem b{font:400 28px/1 var(--display);display:block}
.left .meter{margin-top:20px}.left .meter-n{box-shadow:5px 5px 0 #000}
.right{padding:28px 3vw 80px 2vw;margin-left:-6vw}
.right h2{font:400 clamp(36px,4vw,60px)/1 var(--display);margin:0 0 14px;padding-left:8vw}
.cand{display:grid;grid-template-columns:70px 1fr auto;gap:14px;align-items:center;padding:10px 12px 10px 8vw;border-bottom:1px solid var(--line)}
.cand img{width:70px;height:70px;object-fit:cover;object-position:50% 12%;clip-path:polygon(12% 0,100% 0,88% 100%,0 100%)}
.cand b{font:400 24px/1 var(--display)}.cand p{margin:3px 0 0;font-size:12px;color:#cfc9bf;line-height:1.4}
.cand .rk{font:400 13px/1 var(--display);padding:4px 8px 2px;background:var(--paper);color:#000}.cand.best .rk{background:var(--red);color:#fff}
.vsx{position:absolute;left:39%;top:40vh;z-index:3;font:400 120px/1 var(--display);color:var(--paper);-webkit-text-stroke:4px #000;rotate:-12deg;pointer-events:none}
@media(max-width:860px){.vs{grid-template-columns:1fr}.left{clip-path:none}.right{margin:0}.right h2,.cand{padding-left:12px}.vsx{display:none}.mem{max-width:100%}}`,
  body: `<span class="vsx">VS</span><div class="vs"><section class="left"><h2>YOUR<br>CREW</h2>${[...team, navi].map((u) => `<div class="mem"><img src="${img(u)}" alt=""><div><b>${esc(code(u))}</b><div class="pills">${pills(u)}</div></div></div>`).join('')}<div class="meter"><span class="meter-n">${score}</span><span class="meter-l">Solid<br>crew</span></div></section>
<section class="right"><h2>WHO JOINS NEXT?</h2>${[...best, ...good].map((x) => `<div class="cand ${tierOf(x.u)}"><img src="${img(x.u)}" alt=""><div><b>${esc(code(x.u))}</b>${x.why.slice(0, 1).map((w) => `<p><b style="font-size:12px;color:var(--red-hot)">${esc(code(w.with))}:</b> ${esc(w.text)}</p>`).join('')}</div><span class="rk">${tierOf(x.u).toUpperCase()}</span></div>`).join('')}</section></div>` });

// ---------- write pages + gallery ----------
C.forEach((c, i) => fs.writeFileSync(path.join(out, `${i + 1}.html`), page(i + 1, c.name, c.body, c.css, c.js)));
fs.writeFileSync(path.join(out, 'index.html'), page(0, 'Layout concepts', `<div style="padding:28px 4vw 80px;max-width:1300px;margin:0 auto">
<span class="tag">PHANTOM ROSTER · LAYOUT CONCEPTS</span><h1 style="margin:16px 0 8px;font-size:clamp(36px,6vw,80px)">${ransom('PICK A LAYOUT')}</h1>
<p style="max-width:62ch;color:#cfc9bf;font-weight:700">Ten page structures, all in the Persona 5 style. These are clickable mockups with real units, card art and rotations (example crew: Kotone, Queen, J&C, Miku). The one you pick gets built into the real site.</p>
<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px;margin-top:22px">${C.map((c, i) => `<a href="${i + 1}.html" style="display:block;text-decoration:none;color:var(--paper);background:#111;border:2px solid var(--paper);padding:16px;box-shadow:6px 6px 0 var(--red);clip-path:polygon(0 0,calc(100% - 16px) 0,100% 16px,100% 100%,0 100%)"><b style="font:400 46px/1 var(--display);color:var(--red)">${String(i + 1).padStart(2, '0')}</b><div style="font:400 26px/1 var(--display);margin:4px 0 8px">${esc(c.name)}</div><p style="margin:0;font-size:13px;line-height:1.45;color:#cfc9bf">${esc(c.note)}</p></a>`).join('')}</div></div>`, '.cnav{display:none}'));
console.log(`Wrote ${C.length} concepts to public/concepts/`);
