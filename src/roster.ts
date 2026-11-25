import './style.css';
import './looks.css';
import { UNITS, WONDER, SCRAPED, type Unit } from './data';
import { esc, $, code, cardSrc, ransom, pills, navHTML, BG_HTML, mountLooks } from './ui';
import { advise, candidates, type Advice, type Candidate } from './advice';
import { loadCollection, saveCollection, encodeCollection, decodeCollection, type Collection } from './collection';

// "My roster" page: tick the units and signature weapons you own, and get
// should-I-pull advice for current Global banners and upcoming units.

const POOL = UNITS.filter((u) => u.id !== WONDER.id).sort((a, b) => b.order - a.order);
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
let col: Collection = loadCollection();
const view = { q: '', show: 'all' as 'all' | 'owned' | 'missing' };

const fmtDate = (iso: string) => new Date(iso.replace(' ', 'T') + (iso.length <= 10 ? 'T00:00:00Z' : 'Z'))
  .toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
const sig = (u: Unit) => u.weapons.find((w) => w.rarity === 5);

function shell() {
  $('#app').innerHTML = `
  ${BG_HTML}
  <header class="hero">
    ${navHTML('roster')}
    <div class="hero-tag">P5X · GLOBAL SERVER</div>
    <h1>${ransom('MY ROSTER', 'logo')}</h1>
    <p class="hero-sub">Tick what you own. See what's worth your pulls.</p>
  </header>
  <main class="layout layout-roster">
    <section class="panel pulls" aria-labelledby="pulls-title">
      <div class="panel-head">
        <h2 id="pulls-title" class="sect"><span>SHOULD</span> I PULL?</h2>
      </div>
      <p class="pulls-intro" id="pulls-intro"></p>
      <div class="pull-list" id="pull-list"></div>
      <details class="pull-how">
        <summary>How is this decided?</summary>
        <p>For each unit on a Global banner or coming soon, the site builds your best 3-thief crew from the units you ticked, with and without it. Crew value is team synergy (lufel partners, recommended teams and skill links) plus how strong the members are on lufel's tier list. On top of that: units of yours it pairs with, a role you're missing, its tier, and whether it's limited. Units already in your roster in the same role at the same or better tier count against it.</p>
        <p>The 5★ weapon is only worth it for a unit you own or should pull. It counts most for a damage dealer in your best crew.</p>
        <p>Reruns are banners for units that were already out on Global; a limited rerun counts as a rare chance. Release dates of upcoming units are estimates from lufel's schedule. Tiers for upcoming units come from the KR server, which is ahead of Global.</p>
      </details>
    </section>
    <section class="own-sec" aria-labelledby="own-title">
      <div class="roster-head">
        <h2 id="own-title" class="sect"><span>MY</span> UNITS <em id="own-count"></em></h2>
        <p class="hint">Tap a card to tick it. Set awareness and the 5★ weapon below it.</p>
      </div>
      <div class="filters">
        <label class="search"><span class="visually-hidden">Search units</span>
          <input id="q" type="search" placeholder="Search name or codename…" autocomplete="off" /></label>
        <div class="sort" role="group" aria-label="Show">
          ${(['all', 'owned', 'missing'] as const).map((k) => `<button type="button" class="sort-btn${k === 'all' ? ' on' : ''}" data-show="${k}">${{ all: 'All', owned: 'Owned', missing: 'Missing' }[k]}</button>`).join('')}
        </div>
        <div class="own-tools">
          <button type="button" class="btn-ghost" id="share">Copy link for another device</button>
          <button type="button" class="btn-ghost" id="wipe">Clear</button>
        </div>
      </div>
      <div class="own-grid" id="own-grid"></div>
    </section>
  </main>
  <footer class="foot">Units, weapons, tiers, banners and the release schedule from <a href="https://lufel.net" target="_blank" rel="noopener">lufel.net</a> (scraped ${new Date(SCRAPED).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}). Your roster is saved in this browser only. Fan project, not affiliated with SEGA or Atlus.</footer>
  <div class="toast" id="toast" role="status" aria-live="polite"></div>`;
}

// ---------- should I pull ----------
const VERDICT_LABEL = { pull: 'PULL', maybe: 'MAYBE', skip: 'SKIP', owned: 'OWNED', unknown: '?' } as const;
const WPN_LABEL = { worth: 'WORTH IT', optional: 'OPTIONAL', skip: 'SKIP', owned: 'OWNED' } as const;

const started = (iso: string) => new Date(`${iso.replace(' ', 'T')}Z`).getTime() <= Date.now();
function bannerWhen(b: NonNullable<Candidate['banner']>, what: string) {
  const rerun = b.rerun ? '<span class="when when-rerun">Rerun</span> ' : '';
  return started(b.start)
    ? `${rerun}<span class="when when-live">${what} · until ${fmtDate(b.end)}</span>`
    : `${rerun}<span class="when when-soon">${what} · starts ${fmtDate(b.start)}</span>`;
}
function when(c: Candidate) {
  if (c.banner) return bannerWhen(c.banner, 'On banner');
  if (c.weaponBanner && !c.upcoming) return bannerWhen(c.weaponBanner, 'Weapon banner');
  const eta = c.unit.eta;
  return `<span class="when">${eta ? `Coming ~${fmtDate(eta)}${c.unit.etaConfirmed ? '' : ' <small>(estimate)</small>'}` : 'Coming later'}</span>`;
}

function pullCard(a: Advice, c: Candidate, best: boolean, i: number) {
  const u = a.unit;
  const t = u.tier;
  const w = a.weapon;
  // With no collection yet, every card would repeat the same "tick your units" line; the intro says it once.
  const points = a.verdict === 'unknown' ? a.points.filter((p) => p.pts !== 0) : a.points;
  const why = points.map((p) => `<li class="${p.pts > 0 ? 'up' : p.pts < 0 ? 'down' : 'flat'}"><b>${p.pts > 0 ? `+${p.pts}` : p.pts < 0 ? p.pts : '·'}</b><span>${esc(p.text)}</span></li>`).join('');
  return `<article class="pull pull-${a.verdict}${best ? ' pull-best' : ''}" style="--c:${u.color};--i:${i}">
    <div class="pull-art">${u.card ? `<img src="${cardSrc(u)}" alt="" loading="lazy" />` : ''}
      <span class="pull-stamp">${VERDICT_LABEL[a.verdict]}</span>
      ${best ? '<span class="pull-bestbadge">BEST BET</span>' : ''}
    </div>
    <div class="pull-body">
      ${when(c)}
      <h3>${code(u)}</h3>
      <div class="pull-name">${esc(u.name)}</div>
      <div class="card-pills">${pills(u)}${t ? `<span class="pill pill-tier" title="lufel ${t.list === 'kr' ? 'KR' : 'Global'} tier list">${esc(t.label)}${t.list === 'kr' ? ' KR' : ''}</span>` : ''}${u.limited ? '<span class="pill pill-lim">Limited</span>' : ''}</div>
      ${a.verdict === 'owned' ? `<p class="pull-owned">You have ${esc(u.codename)}${col.get(u.id)?.a ? ` at A${col.get(u.id)!.a}` : ''}.</p>`
        : a.verdict === 'unknown' ? `<ul class="pull-why">${why}</ul>`
        : `<div class="pull-meter" aria-label="Score ${a.score} of 100"><i style="--w:${a.score}%"></i><span>${a.score}</span></div><ul class="pull-why">${why}</ul>`}
      ${w ? `<details class="pull-wpn wpn-${w.verdict}"${w.verdict === 'worth' ? ' open' : ''}>
        <summary class="pull-wpn-head"><span>5★ weapon</span><b>${esc(w.weapon.name)}</b><em>${WPN_LABEL[w.verdict]}</em></summary>
        <p>${esc(w.text)}${c.weaponBanner ? ` ${c.weaponBanner.rerun ? 'Rerun on' : 'On'} ${started(c.weaponBanner.start) ? `banner until ${fmtDate(c.weaponBanner.end)}` : `banner from ${fmtDate(c.weaponBanner.start)}`}.` : ''}</p>
        ${w.weapon.desc ? `<details><summary>Weapon effect${w.weapon.effect ? `: ${esc(w.weapon.effect)}` : ''}</summary><p>${esc(w.weapon.desc)}</p></details>` : ''}
      </details>` : ''}
    </div>
  </article>`;
}

/** animate=false re-renders without the entrance animation (used after each tick, so the list doesn't replay). */
function renderPulls(animate = true) {
  const cs = candidates();
  const list = cs.map((c) => ({ c, a: advise(c, col) }));
  const open = list.filter((x) => x.a.verdict !== 'owned' && x.a.verdict !== 'unknown');
  const top = open.filter((x) => x.a.verdict === 'pull').sort((p, q) => q.a.score - p.a.score)[0];
  const n = [...col.keys()].length;
  $('#pulls-intro').innerHTML = n
    ? `Based on your ${n} unit${n === 1 ? '' : 's'}. ${top ? `Best bet right now: <b>${esc(top.a.unit.codename)}</b>.` : 'Nothing here is a must-pull for your roster.'}`
    : 'Tick the units you own below; the advice updates as you go.';
  // Banners first (they end soonest), then upcoming by date; units you already have go last.
  const ordered = [...list.filter((x) => x.a.verdict !== 'owned'), ...list.filter((x) => x.a.verdict === 'owned')];
  $('#pull-list').classList.toggle('calm', !animate);
  $('#pull-list').innerHTML = ordered.map(({ c, a }, i) => pullCard(a, c, a === top?.a, i)).join('');
}

// ---------- my units ----------
function ownTile(u: Unit, i: number) {
  const o = col.get(u.id);
  const w = sig(u);
  return `<div class="own${o ? ' is-own' : ''}" style="--c:${u.color};--i:${Math.min(i, 30)}">
    <button type="button" class="own-hit" data-own="${esc(u.id)}" aria-pressed="${!!o}" aria-label="${esc(u.name)}${o ? ' (owned)' : ''}">
      <span class="own-art">${u.card ? `<img src="${cardSrc(u)}" alt="" loading="lazy" decoding="async" />` : ''}</span>
      <span class="own-check" aria-hidden="true">${o ? '★' : ''}</span>
      <span class="own-name"><b>${code(u)}</b><span>${esc(u.role || 'Flex')}${u.tier ? ` · ${esc(u.tier.label)}` : ''}</span></span>
    </button>
    ${o ? `<div class="own-ctl">
      <label><span class="visually-hidden">Awareness for ${esc(u.name)}</span><select data-aw="${esc(u.id)}">${[0, 1, 2, 3, 4, 5, 6].map((n) => `<option value="${n}"${o.a === n ? ' selected' : ''}>A${n}</option>`).join('')}</select></label>
      ${w ? `<button type="button" class="own-wpn" data-wpn="${esc(u.id)}" aria-pressed="${o.w}" title="5★ ${esc(w.name)}" aria-label="5★ weapon ${esc(w.name)}">${o.w ? '★' : '☆'} WPN</button>` : ''}
    </div>` : ''}
  </div>`;
}

function renderOwn(animate = true, flash?: string) {
  const q = view.q.trim().toLowerCase();
  const list = POOL.filter((u) => {
    if (view.show === 'owned' && !col.has(u.id)) return false;
    if (view.show === 'missing' && col.has(u.id)) return false;
    return !q || `${u.name} ${u.codename}`.toLowerCase().includes(q);
  });
  $('#own-count').textContent = `${POOL.filter((u) => col.has(u.id)).length}/${POOL.length}`;
  // Keep keyboard focus on the same control across the re-render.
  const act = document.activeElement as HTMLElement | null;
  const key = act && (['own', 'aw', 'wpn'] as const).find((k) => act.dataset?.[k] !== undefined);
  const grid = $('#own-grid');
  grid.classList.toggle('calm', !animate);
  grid.innerHTML = list.length ? list.map(ownTile).join('') : '<p class="empty">Nothing here.</p>';
  if (key) grid.querySelector<HTMLElement>(`[data-${key}="${CSS.escape(act!.dataset[key]!)}"]`)?.focus();
  if (flash) grid.querySelector(`[data-own="${CSS.escape(flash)}"]`)?.closest('.own')?.classList.add('own-flash');
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
  toastTimer = window.setTimeout(() => t.classList.remove('show'), 2600);
}

let pullTimer = 0;
function changed(flash?: string) {
  saveCollection(col);
  renderOwn(false, flash);
  // The crew search is the slow part; let taps feel instant.
  clearTimeout(pullTimer);
  pullTimer = window.setTimeout(() => renderPulls(false), reduceMotion ? 0 : 120);
}

function bind() {
  document.addEventListener('click', async (e) => {
    const t = e.target as HTMLElement;
    const own = t.closest<HTMLElement>('[data-own]');
    if (own) {
      const id = own.dataset.own!;
      if (col.has(id)) col.delete(id); else col.set(id, { a: 0, w: false });
      changed(id);
      return;
    }
    const wpn = t.closest<HTMLElement>('[data-wpn]');
    if (wpn) {
      const o = col.get(wpn.dataset.wpn!);
      if (o) { o.w = !o.w; changed(); }
      return;
    }
    const show = t.closest<HTMLElement>('[data-show]');
    if (show) {
      view.show = show.dataset.show as typeof view.show;
      document.querySelectorAll('[data-show]').forEach((b) => b.classList.toggle('on', b === show));
      renderOwn();
      return;
    }
    if (t.closest('#share')) {
      const url = `${location.origin}${location.pathname}#have=${encodeURIComponent(encodeCollection(col))}`;
      try { await navigator.clipboard.writeText(url); toast('Link copied. Open it on your other device.'); } catch { prompt('Copy this link:', url); }
      return;
    }
    if (t.closest('#wipe') && col.size && confirm('Untick all units?')) { col = new Map(); changed(); }
  });
  document.addEventListener('change', (e) => {
    const sel = (e.target as HTMLElement).closest<HTMLSelectElement>('select[data-aw]');
    const o = sel && col.get(sel.dataset.aw!);
    if (o) { o.a = Number(sel.value); changed(); }
  });
  $<HTMLInputElement>('#q').addEventListener('input', (e) => { view.q = (e.target as HTMLInputElement).value; renderOwn(false); });
}

/** Opening a share link loads that roster (asks first if this browser already has one). */
function importFromLink() {
  const m = location.hash.match(/have=([^&]*)/);
  if (!m) return;
  const incoming = decodeCollection(decodeURIComponent(m[1]));
  history.replaceState(null, '', location.pathname);
  if (!incoming.size) return;
  if (col.size && encodeCollection(col) !== encodeCollection(incoming) && !confirm(`Replace the ${col.size} units saved here with the ${incoming.size} from this link?`)) return;
  col = incoming;
  saveCollection(col);
  setTimeout(() => toast(`Loaded ${incoming.size} units from the link.`), 600);
}

importFromLink();
shell();
bind();
renderOwn();
renderPulls();
mountLooks();
