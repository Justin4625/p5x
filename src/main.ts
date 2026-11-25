import './style.css';
import {
  UNITS, BY_ID, WONDER, ELEMENTS, ROLES, ELEMENT_COLOR, ELEMENT_SHORT, SCRAPED,
  parseAction, translateKr, isNew, type Unit,
} from './data';
import { matchFor, rankTiers, teamScore, unit, type Match } from './synergy';
import { profileLabels } from './skills';

// ---------- state ----------
interface State {
  slots: (string | null)[];
  navi: string | null;
  q: string;
  elements: Set<string>;
  roles: Set<string>;
  sort: 'new' | 'name' | 'speed';
  aw: Record<string, number>;
}
const state: State = { slots: [null, null, null], navi: null, q: '', elements: new Set(), roles: new Set(), sort: 'new', aw: {} };

const POOL = UNITS.filter((u) => u.id !== WONDER.id);
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}
const md = (s: string) => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\n{2,}/g, '</p><p>').replace(/\n/g, ' ');
const $ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => root.querySelector(sel) as T;
/** "WIND·Tempest" -> big "WIND" + small "Tempest". */
function code(u: Unit) {
  const [base, variant] = (u.codename || u.name).split('·');
  return `${esc(base)}${variant ? `<small>${esc(variant)}</small>` : ''}`;
}
const cardSrc = (u: Unit) => (u.card ? `${import.meta.env.BASE_URL}${u.card}` : '');

function team(): Unit[] {
  return [...state.slots.map(unit), unit(state.navi)].filter(Boolean) as Unit[];
}
function inTeam(id: string) {
  return state.slots.includes(id) || state.navi === id;
}

// ---------- persistence (URL hash, so teams are shareable) ----------
function save() {
  const t = state.slots.map((s) => (s ? encodeURIComponent(s) : '')).join(',');
  const hash = state.slots.some(Boolean) || state.navi ? `#t=${t}${state.navi ? `&n=${encodeURIComponent(state.navi)}` : ''}` : ' ';
  history.replaceState(null, '', hash === ' ' ? location.pathname : hash);
  try { localStorage.setItem('p5x-team', hash); } catch { /* private mode */ }
}
function load() {
  let hash = location.hash;
  if (!hash) { try { hash = localStorage.getItem('p5x-team') || ''; } catch { hash = ''; } }
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  const t = (params.get('t') || '').split(',').map((s) => (s && BY_ID.has(s) && !BY_ID.get(s)!.navigator ? s : null));
  state.slots = [0, 1, 2].map((i) => t[i] ?? null);
  const n = params.get('n');
  state.navi = n && BY_ID.get(n)?.navigator ? n : null;
}

// ---------- shell ----------
function ransom(text: string, cls = '') {
  const looks = ['r-a', 'r-b', 'r-c', 'r-d', 'r-e', 'r-f'];
  let k = 0;
  let i = 0;
  const words = text.split(' ').map((w) => `<span class="r-word">${[...w].map((ch) => {
    const look = looks[(i * 7 + text.length) % looks.length];
    const rot = (((i * 37) % 11) - 5) * 1.2;
    i++;
    return `<span class="r ${look}" aria-hidden="true" style="--rot:${rot}deg;--d:${k++ * 45}ms">${esc(ch)}</span>`;
  }).join('')}</span>`);
  return `<span class="ransom ${cls}" role="img" aria-label="${esc(text)}">${words.join('<span class="r-gap"></span>')}</span>`;
}

function shell() {
  const app = $('#app');
  app.innerHTML = `
  <div class="bg" aria-hidden="true">
    <div class="bg-rays"></div><div class="bg-dots"></div>
    <div class="bg-slash s1"></div><div class="bg-slash s2"></div><div class="bg-slash s3"></div>
  </div>
  <div class="intro" aria-hidden="true"><div class="intro-band"></div><div class="intro-text">TAKE YOUR TIME</div></div>
  <header class="hero">
    <div class="hero-tag">P5X · GLOBAL SERVER</div>
    <h1>${ransom('PHANTOM ROSTER', 'logo')}</h1>
    <p class="hero-sub">Build a three-thief crew. See who clicks. Learn the turn order.</p>
  </header>
  <main class="layout">
    <section class="builder panel" aria-labelledby="builder-title">
      <div class="panel-head">
        <h2 id="builder-title" class="sect"><span>TEAM</span> BUILDER</h2>
        <button class="btn-ghost" id="clear" type="button">Reset</button>
      </div>
      <div class="slots" id="slots"></div>
      <div class="meter" id="meter"></div>
      <div class="turns" id="turns"></div>
    </section>
    <section class="roster" aria-labelledby="roster-title">
      <div class="roster-head">
        <h2 id="roster-title" class="sect"><span>GLOBAL</span> UNITS <em id="count"></em></h2>
        <p class="hint" id="hint"></p>
      </div>
      <div class="filters">
        <label class="search"><span class="visually-hidden">Search units</span>
          <input id="q" type="search" placeholder="Search name, codename, persona…" autocomplete="off" /></label>
        <div class="chips" id="f-el">${ELEMENTS.map((e) => `<button type="button" class="chip" data-el="${e}" style="--ec:${ELEMENT_COLOR[e]}">${ELEMENT_SHORT[e]}</button>`).join('')}</div>
        <div class="chips" id="f-role">${ROLES.map((r) => `<button type="button" class="chip chip-role" data-role="${r}">${r}</button>`).join('')}</div>
        <div class="sort" role="group" aria-label="Sort">
          ${(['new', 'name', 'speed'] as const).map((s) => `<button type="button" class="sort-btn${s === 'new' ? ' on' : ''}" data-sort="${s}">${{ new: 'Newest', name: 'A–Z', speed: 'Speed' }[s]}</button>`).join('')}
        </div>
      </div>
      <div class="grid" id="grid"></div>
    </section>
  </main>
  <footer class="foot">Unit data, teams and rotations from <a href="https://lufel.net" target="_blank" rel="noopener">lufel.net</a> (scraped ${new Date(SCRAPED).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}). Fan project, not affiliated with SEGA or Atlus.</footer>
  <div class="drawer" id="drawer" aria-hidden="true"><div class="drawer-scrim" data-close></div><aside class="drawer-body" role="dialog" aria-modal="true" aria-label="Unit details"></aside></div>
  <div class="toast" id="toast" role="status" aria-live="polite"></div>
  <div class="skillpop" id="skillpop" role="dialog" aria-label="Skill details"></div>`;

  if (!reduceMotion) document.body.classList.add('intro-on');
  setTimeout(() => document.body.classList.remove('intro-on'), 1500);
}

// ---------- roster grid ----------
function visibleUnits(): Unit[] {
  const q = state.q.trim().toLowerCase();
  let list = POOL.filter((u) => {
    if (state.elements.size && !u.elements.some((e) => state.elements.has(e))) return false;
    if (state.roles.size && !state.roles.has(u.role)) return false;
    if (q && !`${u.name} ${u.codename} ${u.persona} ${u.mechanics.join(' ')}`.toLowerCase().includes(q)) return false;
    return true;
  });
  if (state.sort === 'name') list = list.sort((a, b) => a.name.localeCompare(b.name));
  else if (state.sort === 'speed') list = list.sort((a, b) => (b.speed ?? 0) - (a.speed ?? 0));
  else list = list.sort((a, b) => b.order - a.order);
  return list;
}

function pills(u: Unit) {
  const el = u.elements.map((e) => `<span class="pill pill-el" style="--ec:${ELEMENT_COLOR[e] ?? '#ddd'}">${ELEMENT_SHORT[e] ?? esc(e.slice(0, 5).toUpperCase())}</span>`).join('');
  return `${isNew(u) ? '<span class="pill pill-new">NEW</span>' : ''}${el}<span class="pill pill-role">${esc(u.role || 'Flex')}</span>`;
}

function renderGrid() {
  const list = visibleUnits();
  $('#count').textContent = String(list.length);
  const grid = $('#grid');
  grid.innerHTML = list.length ? list.map((u, i) => `
    <article class="card" data-id="${esc(u.id)}" style="--c:${u.color};--i:${Math.min(i, 24)}">
      <button type="button" class="card-hit" data-pick="${esc(u.id)}" aria-label="Add ${esc(u.name)} to team"></button>
      <div class="card-art">${u.card ? `<img src="${cardSrc(u)}" alt="" loading="lazy" decoding="async" />` : ''}</div>
      <div class="card-badge" aria-hidden="true"></div>
      <div class="card-stamp" aria-hidden="true">IN TEAM</div>
      <div class="card-text">
        <b>${code(u)}</b>
        <span>${esc(u.name)}</span>
        <div class="card-pills">${pills(u)}</div>
      </div>
      <div class="card-why" aria-hidden="true"></div>
      <button type="button" class="card-info" data-info="${esc(u.id)}" aria-label="Details for ${esc(u.name)}">i</button>
    </article>`).join('') : `<p class="empty">No thief matches that filter.</p>`;
  applyHighlights();
}

function applyHighlights() {
  const t = team();
  const fighters = t.filter((u) => !u.navigator);
  const hint = $('#hint');
  hint.textContent = t.length
    ? `Highlighted cards fit your crew. ${matchMedia('(hover: hover)').matches ? 'Hover a card' : 'Tap ⓘ'} to see why.`
    : 'Tap a card to add it. Matching thieves light up.';
  document.body.classList.toggle('has-team', t.length > 0);
  const matches = new Map<string, Match>();
  for (const u of POOL) {
    if (inTeam(u.id)) continue;
    // Navigators are judged against the fighters; fighters against the whole crew.
    matches.set(u.id, matchFor(u, u.navigator ? fighters : t));
  }
  // Fighters and navigators compete in separate pools.
  rankTiers(new Map([...matches].filter(([id]) => !BY_ID.get(id)!.navigator)));
  rankTiers(new Map([...matches].filter(([id]) => BY_ID.get(id)!.navigator)), 1, 3);
  for (const el of document.querySelectorAll<HTMLElement>('.card')) {
    const u = BY_ID.get(el.dataset.id!)!;
    const picked = inTeam(u.id);
    const m: Match = matches.get(u.id) ?? { score: 0, tier: 'none', reasons: [] };
    el.dataset.tier = picked ? 'picked' : m.tier;
    el.classList.toggle('is-picked', picked);
    const badge = el.querySelector('.card-badge')!;
    badge.textContent = m.tier === 'best' ? 'BEST' : m.tier === 'good' ? 'GOOD' : '';
    const why = el.querySelector<HTMLElement>('.card-why')!;
    const good = m.reasons.filter((r) => r.weight > 0).slice(0, 2);
    why.innerHTML = good.map((r) => `<p>${r.with ? `<b>${esc(unit(r.with)!.codename)}</b> ` : ''}${esc(trim(r.text, 110))}</p>`).join('');
  }
}
const trim = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

// ---------- team slots ----------
function slotHTML(u: Unit | undefined, i: number | 'navi') {
  const label = i === 'navi' ? 'NAVI' : `THIEF 0${(i as number) + 1}`;
  if (!u) {
    return `<div class="slot slot-empty${i === 'navi' ? ' slot-navi' : ''}" data-slot="${i}">
      <div class="slot-star" aria-hidden="true"></div>
      <span class="slot-label">${label}</span>
      <span class="slot-cta">${i === 'navi' ? 'Optional' : 'Pick a thief'}</span>
    </div>`;
  }
  return `<div class="slot slot-full${i === 'navi' ? ' slot-navi' : ''}" data-slot="${i}" style="--c:${u.color}">
    <div class="slot-art">${u.card ? `<img src="${cardSrc(u)}" alt="" />` : ''}</div>
    <span class="slot-label">${label}</span>
    <div class="slot-name"><b>${code(u)}</b><span>${esc(u.role)}${u.elements.length ? ` · ${u.elements.join('/')}` : ''}</span></div>
    <button type="button" class="slot-x" data-remove="${i}" aria-label="Remove ${esc(u.name)}">×</button>
    <button type="button" class="slot-hit" data-info="${esc(u.id)}" aria-label="Details for ${esc(u.name)}"></button>
  </div>`;
}

function renderSlots(flash?: number | 'navi') {
  const w = WONDER;
  $('#slots').innerHTML = `
    ${state.slots.map((id, i) => slotHTML(unit(id), i)).join('')}
    <div class="slot slot-full slot-wonder" style="--c:#e60012">
      <div class="slot-art">${w.card ? `<img src="${cardSrc(w)}" alt="" />` : ''}</div>
      <span class="slot-label">ALWAYS IN</span>
      <div class="slot-name"><b>WONDER</b><span>Flex · Persona swaps</span></div>
    </div>
    ${slotHTML(unit(state.navi), 'navi')}`;
  if (flash !== undefined && !reduceMotion) {
    const el = $(`.slot[data-slot="${flash}"]`);
    el?.classList.add('slam');
  }
}

function renderMeter() {
  const t = team();
  const { score, label } = teamScore(t);
  const fighters = t.filter((u) => !u.navigator);
  const roles = new Set(fighters.map((u) => u.role));
  const has = (set: string[]) => set.some((r) => roles.has(r));
  const checks = [
    ['Damage', has(['Sweeper', 'Assassin'])],
    ['Support', has(['Strategist', 'Saboteur', 'Virtuoso'])],
    ['Sustain', has(['Medic', 'Guardian'])],
    ['Navigator', !!state.navi],
  ] as const;
  $('#meter').innerHTML = `
    <div class="meter-score"><span class="meter-num" data-n="${score}">${score}</span><span class="meter-label">${esc(label)}</span></div>
    <div class="meter-bar"><i style="--w:${score}%"></i></div>
    <ul class="meter-checks">${checks.map(([k, ok]) => `<li class="${ok ? 'ok' : ''}">${k}</li>`).join('')}</ul>`;
  const num = $('.meter-num');
  if (!reduceMotion) countUp(num, score);
}

let lastScore = 0;
function countUp(el: HTMLElement, to: number) {
  const from = lastScore;
  lastScore = to;
  const t0 = performance.now();
  const step = (now: number) => {
    const p = Math.min(1, (now - t0) / 600);
    el.textContent = String(Math.round(from + (to - from) * (1 - (1 - p) ** 3)));
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// ---------- turn order ----------
function renderTurns() {
  const fighters = state.slots.map(unit).filter(Boolean) as Unit[];
  const box = $('#turns');
  if (!fighters.length) {
    box.innerHTML = `<div class="turns-empty"><span class="calling">${ransom('NO CREW YET')}</span><p>Add thieves to see the turn-by-turn plan.</p></div>`;
    return;
  }
  const order = [...fighters].sort((a, b) => (b.speed ?? 0) - (a.speed ?? 0));
  const navi = unit(state.navi);
  const lanes: { u: Unit; kind: 'fighter' | 'wonder' | 'navi' }[] = [
    ...order.map((u) => ({ u, kind: 'fighter' as const })),
    { u: WONDER, kind: 'wonder' },
    ...(navi ? [{ u: navi, kind: 'navi' as const }] : []),
  ];
  const rot = (u: Unit) => u.rotations[Math.min(state.aw[u.id] ?? 0, u.rotations.length - 1)];
  const turns = Math.min(8, Math.max(3, ...lanes.map((l) => rot(l.u)?.steps.length ?? 0)));

  const cell = (u: Unit, kind: string, t: number) => {
    if (kind === 'wonder') return `<div class="act act-flex"><b>PERSONA</b><span>Fill gaps</span></div>`;
    const r = rot(u);
    if (!r) return `<div class="act act-none"><b>?</b><span>No guide</span></div>`;
    const step = r.steps[t % r.steps.length];
    return `<div class="act-stack">${step.map((tok) => {
      const a = parseAction(u, tok);
      const title = a.skill ? `${a.label}${a.skill.type ? ` · ${a.skill.type}` : ''}${a.skill.sp ? ` · ${a.skill.sp} SP` : ''}\n\n${a.skill.desc}` : a.label;
      return `<div class="act${a.idle ? ' act-idle' : ''}${a.auto ? ' act-auto' : ''}${a.code.startsWith('HL') ? ' act-hl' : ''}" title="${esc(title)}" tabindex="0" data-act="${esc(u.id)}" data-tok="${esc(tok)}">
        <b>${esc(a.code)}${a.auto ? '<i>AUTO</i>' : ''}</b><span>${esc(a.label)}</span></div>`;
    }).join('')}</div>`;
  };

  const awChips = (u: Unit) => (u.rotations.length > 1
    ? `<label class="aw"><span class="visually-hidden">Awareness for ${esc(u.name)}</span><select data-aw="${esc(u.id)}">${u.rotations.map((r, i) => `<option value="${i}"${(state.aw[u.id] ?? 0) === i ? ' selected' : ''}>${esc(translateKr(r.label))}</option>`).join('')}</select></label>`
    : u.rotations[0] ? `<span class="aw aw-one">${esc(translateKr(u.rotations[0].label))}</span>` : '');

  const notes = lanes.filter((l) => l.u.rotationNotes.length && l.kind !== 'wonder');

  box.innerHTML = `
    <div class="turns-head">
      <h3 class="sect sm"><span>TURN</span> ORDER</h3>
      <p>Action order follows base Speed. Tap a move for the skill text.</p>
    </div>
    <div class="tt" style="--turns:${turns}">
      <div class="tt-row tt-top"><div class="tt-who"></div>${Array.from({ length: turns }, (_, t) => `<div class="tt-t">T${t + 1}</div>`).join('')}</div>
      ${lanes.map((l, li) => `
        <div class="tt-row tt-${l.kind}" style="--c:${l.kind === 'wonder' ? '#e60012' : l.u.color};--li:${li}">
          <div class="tt-who">
            <span class="tt-pos${l.kind === "navi" ? " tt-pos-sm" : ""}">${l.kind === "navi" ? "NAV" : l.kind === 'wonder' ? '★' : li + 1}</span>
            <div class="tt-face">${l.u.card ? `<img src="${cardSrc(l.u)}" alt="" />` : ''}</div>
            <div class="tt-id"><b>${code(l.u)}</b>
              <span>${l.kind === 'wonder' ? 'Speed varies' : l.kind === 'navi' ? 'Support skills' : `SPD ${l.u.speed ?? '?'}`}</span>
              ${l.kind === 'wonder' ? '' : awChips(l.u)}</div>
          </div>
          ${Array.from({ length: turns }, (_, t) => `<div class="tt-c" style="--t:${t}">${cell(l.u, l.kind, t)}</div>`).join('')}
        </div>`).join('')}
    </div>
    ${notes.length ? `<details class="tt-notes"><summary>Rotation notes (${notes.length})</summary>${notes.map((l) => `<div><b>${esc(l.u.codename)}</b><ul>${l.u.rotationNotes.map((n) => `<li>${esc(n.replace(/^·\s*/, ''))}</li>`).join('')}</ul></div>`).join('')}</details>` : ''}`;
}

// ---------- detail drawer ----------
function whyHTML(u: Unit) {
  const t = team();
  if (!t.length || inTeam(u.id) || u.id === WONDER.id) return '';
  const m = matchFor(u, u.navigator ? t.filter((x) => !x.navigator) : t);
  if (!m.reasons.length) return '';
  return `<section class="d-sec d-why"><h4>Fit with your crew</h4>${m.reasons.map((r) => `<p>${r.weight < 0 ? '▼' : '★'} ${r.with ? `<b>${esc(unit(r.with)!.codename)}:</b> ` : ''}${esc(r.text)}</p>`).join('')}</section>`;
}

/** What the skill text says this unit brings to a team and looks for in partners. */
function playHTML(u: Unit) {
  if (u.id === WONDER.id) return '';
  const { gives, wants } = profileLabels(u);
  if (!gives.length && !wants.length) return '';
  const row = (k: string, xs: string[]) => (xs.length ? `<div class="d-play-row"><dt>${k}</dt><dd>${xs.map((x) => `<span>${esc(x)}</span>`).join('')}</dd></div>` : '');
  return `<section class="d-sec d-play"><h4>From the skills</h4><dl>${row('Brings', gives)}${row('Looks for', wants)}</dl></section>`;
}

function openDrawer(id: string) {
  const u = BY_ID.get(id);
  if (!u) return;
  const drawer = $('#drawer');
  const body = $('.drawer-body', drawer);
  const skills = Object.entries(u.skills);
  const skillLabel = (k: string) => k.replace('skill_highlight', 'HL').replace('skill_passive', 'P').replace('skill_support', 'Sup').replace('skill', 'S');
  body.style.setProperty('--c', u.color);
  body.innerHTML = `
    <button type="button" class="drawer-x" data-close aria-label="Close">×</button>
    <div class="d-hero">
      <div class="d-art">${u.card ? `<img src="${cardSrc(u)}" alt="${esc(u.name)} card art" />` : ''}</div>
      <div class="d-id">
        <span class="d-code">${esc(u.codename)}</span>
        <h3>${esc(u.name)}</h3>
        <div class="card-pills">${pills(u)}${u.limited ? '<span class="pill pill-lim">Limited</span>' : ''}</div>
        <dl class="d-stats">
          ${u.persona ? `<div><dt>Persona</dt><dd>${esc(u.persona)}</dd></div>` : ''}
          ${u.speed ? `<div><dt>Speed</dt><dd>${u.speed}</dd></div>` : ''}
          ${u.skillPriority ? `<div><dt>Skill priority</dt><dd>${esc(u.skillPriority)}</dd></div>` : ''}
        </dl>
        ${u.mechanics.length ? `<div class="d-tags">${u.mechanics.map((m) => `<span>${esc(m)}</span>`).join('')}</div>` : ''}
        ${u.id !== WONDER.id ? `<button type="button" class="btn-red" data-pick="${esc(u.id)}">${inTeam(u.id) ? 'Remove from team' : 'Add to team'}</button>` : ''}
      </div>
    </div>
    ${whyHTML(u)}
    ${playHTML(u)}
    ${u.review ? `<section class="d-sec"><h4>Overview</h4><p>${md(u.review)}</p></section>` : ''}
    ${u.friends.length ? `<section class="d-sec"><h4>Best partners</h4><div class="d-friends">${u.friends.map((f) => {
      const p = unit(f.id)!;
      return `<button type="button" class="d-friend" data-info="${esc(p.id)}" style="--c:${p.color}">
        <span class="d-face">${p.card ? `<img src="${cardSrc(p)}" alt="" />` : ''}</span>
        <span><b>${esc(p.codename)}</b><small>${esc(trim(f.comment, 160))}</small></span></button>`;
    }).join('')}</div></section>` : ''}
    ${skills.length ? `<section class="d-sec"><h4>Skills</h4>${skills.map(([k, s]) => `
      <div class="d-skill"><span class="d-sk">${skillLabel(k)}</span><div><b>${esc(s.name)}</b>${s.type ? `<em>${esc(s.type)}${s.sp ? ` · ${s.sp} SP` : ''}</em>` : ''}<p>${esc(s.desc)}</p></div></div>`).join('')}</section>` : ''}
    ${u.rotations.length ? `<section class="d-sec"><h4>Rotations</h4>${u.rotations.map((r) => `
      <div class="d-rot"><span>${esc(translateKr(r.label))}</span><ol>${r.steps.map((st) => `<li>${st.map((t) => esc(parseAction(u, t).code)).join(' + ')}</li>`).join('')}</ol></div>`).join('')}</section>` : ''}`;
  drawer.classList.add('open');
  drawer.setAttribute('aria-hidden', 'false');
  body.scrollTop = 0;
  $<HTMLButtonElement>('.drawer-x', body).focus();
}
function closeDrawer() {
  const d = $('#drawer');
  d.classList.remove('open');
  d.setAttribute('aria-hidden', 'true');
}

// ---------- actions ----------
let toastTimer = 0;
function toast(msg: string) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.remove('show');
  void t.offsetWidth;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => t.classList.remove('show'), 2400);
}

function fly(fromEl: Element | null, slotSel: string) {
  if (reduceMotion || !fromEl) return;
  const img = fromEl.querySelector('img');
  const target = $(slotSel);
  if (!img || !target) return;
  const a = img.getBoundingClientRect();
  const b = target.getBoundingClientRect();
  // Slot off screen (phone: builder sits above the roster): pop in place instead of flying out of view.
  const visible = b.bottom > 0 && b.top < innerHeight;
  const ghost = img.cloneNode() as HTMLImageElement;
  ghost.className = 'ghost';
  Object.assign(ghost.style, { left: `${a.left}px`, top: `${a.top}px`, width: `${a.width}px`, height: `${a.height}px` });
  document.body.appendChild(ghost);
  if (!visible) {
    ghost.animate([
      { transform: 'scale(1) rotate(0)', opacity: 1 },
      { transform: 'scale(1.12) rotate(-6deg)', opacity: 1, offset: 0.4 },
      { transform: 'scale(.6) rotate(8deg)', opacity: 0 },
    ], { duration: 480, easing: 'cubic-bezier(.2,1.4,.35,1)' }).onfinish = () => ghost.remove();
    return;
  }
  const dx = b.left + b.width / 2 - (a.left + a.width / 2);
  const dy = b.top + b.height / 2 - (a.top + a.height / 2);
  const s = Math.min(b.width / a.width, b.height / a.height);
  ghost.animate([
    { transform: 'translate(0,0) rotate(0) scale(1)', opacity: 1 },
    { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - 80}px) rotate(-14deg) scale(${(1 + s) / 2})`, opacity: 1, offset: 0.55 },
    { transform: `translate(${dx}px, ${dy}px) rotate(4deg) scale(${s})`, opacity: 0 },
  ], { duration: 620, easing: 'cubic-bezier(.6,-0.2,.3,1)' }).onfinish = () => ghost.remove();
}

function pick(id: string) {
  const u = BY_ID.get(id);
  if (!u || u.id === WONDER.id) return;
  const card = document.querySelector(`.card[data-id="${CSS.escape(id)}"]`);
  let flash: number | 'navi' | undefined;
  if (inTeam(id)) {
    if (state.navi === id) state.navi = null;
    state.slots = state.slots.map((s) => (s === id ? null : s));
  } else if (u.navigator) {
    state.navi = id;
    flash = 'navi';
  } else {
    const free = state.slots.indexOf(null);
    if (free === -1) { toast('Crew is full. Remove a thief first.'); return; }
    state.slots[free] = id;
    flash = free;
  }
  if (flash !== undefined) {
    const slot = $(`.slot[data-slot="${flash}"]`).getBoundingClientRect();
    if (slot.bottom < 0 || slot.top > innerHeight) {
      toast(flash === 'navi' ? `${u.codename} is your navigator` : `${u.codename} joins · ${state.slots.filter(Boolean).length}/3`);
    }
  }
  update(flash);
  if (flash !== undefined) fly(card, `.slot[data-slot="${flash}"]`);
}

function update(flash?: number | 'navi') {
  save();
  renderSlots(flash);
  renderMeter();
  renderTurns();
  applyHighlights();
  if ($('#drawer').classList.contains('open')) {
    const btn = $('.drawer-body .btn-red');
    const id = btn?.dataset.pick;
    if (btn && id) btn.textContent = inTeam(id) ? 'Remove from team' : 'Add to team';
  }
}

function bind() {
  document.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    const info = t.closest<HTMLElement>('[data-info]');
    if (info) { openDrawer(info.dataset.info!); return; }
    const p = t.closest<HTMLElement>('[data-pick]');
    if (p) { pick(p.dataset.pick!); return; }
    const rm = t.closest<HTMLElement>('[data-remove]');
    if (rm) {
      const k = rm.dataset.remove!;
      if (k === 'navi') state.navi = null; else state.slots[Number(k)] = null;
      update();
      return;
    }
    if (t.closest('[data-close]')) { closeDrawer(); return; }
    const act = t.closest<HTMLElement>('[data-act]');
    if (act) { showSkill(act.dataset.act!, act.dataset.tok!); return; }
    if (!t.closest('#skillpop')) hideSkill();
    const empty = t.closest<HTMLElement>('.slot-empty');
    if (empty) {
      if (empty.dataset.slot === 'navi') { state.roles = new Set(['Navigator']); syncChips(); renderGrid(); }
      $('.roster').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
      return;
    }
    const el = t.closest<HTMLElement>('[data-el]');
    if (el) { toggle(state.elements, el.dataset.el!); syncChips(); renderGrid(); return; }
    const role = t.closest<HTMLElement>('[data-role]');
    if (role) { toggle(state.roles, role.dataset.role!); syncChips(); renderGrid(); return; }
    const sort = t.closest<HTMLElement>('[data-sort]');
    if (sort) {
      state.sort = sort.dataset.sort as State['sort'];
      document.querySelectorAll('.sort-btn').forEach((b) => b.classList.toggle('on', b === sort));
      renderGrid();
      return;
    }
    if (t.closest('[data-pop-close]')) { hideSkill(); return; }
    if (t.closest('#clear')) { state.slots = [null, null, null]; state.navi = null; update(); }
  });
  document.addEventListener('change', (e) => {
    const sel = (e.target as HTMLElement).closest<HTMLSelectElement>('select[data-aw]');
    if (sel) { state.aw[sel.dataset.aw!] = Number(sel.value); renderTurns(); }
  });
  $<HTMLInputElement>('#q').addEventListener('input', (e) => { state.q = (e.target as HTMLInputElement).value; renderGrid(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { closeDrawer(); hideSkill(); }
    const act = (e.target as HTMLElement).closest?.<HTMLElement>('[data-act]');
    if (act && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); showSkill(act.dataset.act!, act.dataset.tok!); }
  });
}
function showSkill(id: string, tok: string) {
  const u = BY_ID.get(id);
  if (!u) return;
  const a = parseAction(u, tok);
  const pop = $('#skillpop');
  const meta = [a.code, a.auto ? 'Auto' : '', a.skill?.type || '', a.skill?.sp ? `${a.skill.sp} SP` : ''].filter(Boolean).join(' · ');
  pop.innerHTML = `<button type="button" data-pop-close aria-label="Close">×</button>
    <em>${esc(u.codename)} · ${esc(meta)}</em><b>${esc(a.label)}</b>
    ${a.skill?.desc ? `<p>${esc(a.skill.desc)}</p>` : a.idle ? '<p>Skip this unit this turn (guard or basic attack).</p>' : ''}`;
  pop.classList.add('show');
}
function hideSkill() { $('#skillpop').classList.remove('show'); }
function toggle(set: Set<string>, v: string) { if (set.has(v)) set.delete(v); else set.add(v); }
function syncChips() {
  document.querySelectorAll<HTMLElement>('[data-el]').forEach((b) => b.classList.toggle('on', state.elements.has(b.dataset.el!)));
  document.querySelectorAll<HTMLElement>('[data-role]').forEach((b) => b.classList.toggle('on', state.roles.has(b.dataset.role!)));
}

// ---------- boot ----------
load();
shell();
bind();
renderSlots();
renderMeter();
renderTurns();
renderGrid();
save();
