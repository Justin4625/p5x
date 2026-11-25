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
    <div class="bg-slash s1"></div><div class="bg-slash s2"></div><div class="bg-slash s3"></div>
  </div>`;
