import { ELEMENT_COLOR, ELEMENT_SHORT, isNew, type Unit } from './data';

// Shared UI helpers for both pages.
export function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}
export const md = (s: string) => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\n{2,}/g, '</p><p>').replace(/\n/g, ' ');
export const $ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => root.querySelector(sel) as T;
/** "WIND·Tempest" -> big "WIND" + small "Tempest". */
export function code(u: Unit) {
  const [base, variant] = (u.codename || u.name).split('·');
  return `${esc(base)}${variant ? `<small>${esc(variant)}</small>` : ''}`;
}
export const cardSrc = (u: Unit) => (u.card ? `${import.meta.env.BASE_URL}${u.card}` : '');
export const trim = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

export function ransom(text: string, cls = '') {
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

export function pills(u: Unit) {
  const el = u.elements.map((e) => `<span class="pill pill-el" style="--ec:${ELEMENT_COLOR[e] ?? '#ddd'}">${ELEMENT_SHORT[e] ?? esc(e.slice(0, 5).toUpperCase())}</span>`).join('');
  return `${isNew(u) ? '<span class="pill pill-new">NEW</span>' : ''}${el}<span class="pill pill-role">${esc(u.role || 'Flex')}</span>`;
}

/** Top-of-page links between the two pages. */
export function navHTML(active: 'builder' | 'roster') {
  const base = import.meta.env.BASE_URL;
  const a = (k: string, href: string, label: string) => `<a class="nav-link${active === k ? ' on' : ''}" href="${base}${href}"${active === k ? ' aria-current="page"' : ''}>${label}</a>`;
  return `<nav class="nav" aria-label="Pages">${a('builder', '', 'Team builder')}${a('roster', 'roster.html', 'My roster · Should I pull?')}</nav>`;
}

/** Intro wipe + background shared by both pages. */
export const BG_HTML = `<div class="bg" aria-hidden="true">
    <div class="bg-rays"></div><div class="bg-dots"></div>
    <div class="bg-slash s1"></div>
  </div>`;

/* ---------- look preview switcher (see looks.css) ---------- */
export const LOOKS: { id: string; name: string; note: string; sw: string[] }[] = [
  { id: 'phantom', name: 'Phantom', note: 'Current: P5 red and black, ransom letters, slants', sw: ['#0a0a0a', '#e60012', '#f4f1ea'] },
  { id: 'calling', name: 'Calling Card', note: 'Light paper, black ink, red stamps', sw: ['#ece6da', '#141414', '#d6001c'] },
  { id: 'velvet', name: 'Velvet Room', note: 'Midnight blue, gold, serif. Calm and elegant', sw: ['#0a0f24', '#c9a227', '#ece6d3'] },
  { id: 'darkhour', name: 'Dark Hour', note: 'Deep teal night, cyan accent (P3 feel)', sw: ['#03121b', '#17c0ff', '#e4f5fd'] },
  { id: 'midnight', name: 'Midnight Channel', note: 'Black and TV yellow, scanlines (P4 feel)', sw: ['#0c0c0c', '#ffd400', '#fdfbef'] },
  { id: 'minimal', name: 'Minimal', note: 'Graphite tool, flat, red only as accent', sw: ['#121212', '#262626', '#e60012'] },
  { id: 'clean', name: 'Clean Light', note: 'Bright app UI, rounded, soft shadows', sw: ['#f4f4f5', '#ffffff', '#e11d2e'] },
  { id: 'newsprint', name: 'Newsprint', note: 'Cream paper, serif headlines, halftone', sw: ['#f1ecdf', '#1a1a1a', '#b5121b'] },
  { id: 'mementos', name: 'Mementos', note: 'Violet depths, magenta, full P5 shapes', sw: ['#11061a', '#ff2e88', '#7b2cff'] },
  { id: 'leblanc', name: 'Leblanc', note: 'Warm café browns, amber, serif', sw: ['#1a130e', '#d9822b', '#f3e6d0'] },
];

export function setLook(id: string) {
  const look = LOOKS.find((l) => l.id === id) ? id : 'phantom';
  if (look === 'phantom') delete document.documentElement.dataset.look; else document.documentElement.dataset.look = look;
  try { localStorage.setItem('p5x-look', look); } catch { /* private mode */ }
  return look;
}

/** Floating LOOK button + list. Mounted once per page. */
export function mountLooks() {
  const box = document.createElement('div');
  box.className = 'looks';
  const current = () => document.documentElement.dataset.look || 'phantom';
  const render = () => {
    const cur = LOOKS.find((l) => l.id === current())!;
    box.innerHTML = `<div class="looks-list" id="looks-list" hidden role="menu">${LOOKS.map((l, i) => `
      <button type="button" role="menuitemradio" data-look-id="${l.id}" aria-current="${l.id === cur.id}" aria-checked="${l.id === cur.id}">
        <span class="looks-sw">${l.sw.map((c) => `<span style="background:${c}"></span>`).join('')}</span>
        <span><b>${i + 1} · ${l.name}</b><small>${l.note}</small></span>
      </button>`).join('')}</div>
      <button type="button" class="looks-btn" aria-expanded="false" aria-controls="looks-list"><i></i>Look: ${cur.name}</button>`;
  };
  render();
  box.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    const pick = t.closest<HTMLElement>('[data-look-id]');
    if (pick) { setLook(pick.dataset.lookId!); render(); box.querySelector<HTMLElement>('.looks-list')!.hidden = false; box.querySelector('.looks-btn')!.setAttribute('aria-expanded', 'true'); return; }
    if (t.closest('.looks-btn')) {
      const list = box.querySelector<HTMLElement>('.looks-list')!;
      list.hidden = !list.hidden;
      box.querySelector('.looks-btn')!.setAttribute('aria-expanded', String(!list.hidden));
    }
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') box.querySelector<HTMLElement>('.looks-list')!.hidden = true; });
  document.body.append(box);
}
