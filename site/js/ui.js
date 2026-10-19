// 画面づくりの小さな道具
import { BASIS } from './data.js';

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

const ICONS = {
  home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v10h13V10"/><path d="M10 20v-5.5h4V20"/>',
  explore: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>',
  zukan: '<path d="M4 5.5C6.5 4 9.5 4 12 5.5v14C9.5 18 6.5 18 4 19.5z"/><path d="M20 5.5C17.5 4 14.5 4 12 5.5v14c2.5-1.5 5.5-1.5 8 0z"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7"/>',
  play: '<path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/>',
  pause: '<path d="M8 5.5v13M16 5.5v13" stroke-width="3.2"/>',
  back30: '<path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3"/><path d="M4 3.5v4h4"/><text x="12" y="15.2" font-size="7.2" text-anchor="middle" fill="currentColor" stroke="none" font-family="sans-serif" font-weight="700">30</text>',
  log: '<path d="M5 6h14M5 11h14M5 16h9"/>',
  more: '<circle cx="5.5" cy="12" r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><circle cx="18.5" cy="12" r="1.6" fill="currentColor"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
};

export function icon(name) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${ICONS[name] || ''}</svg>`;
}

// 仮の景色（グラデーションの枠）
export function scene(story, label = '仮の景色') {
  const t = (story && story.theme) || {};
  const vars = Object.entries({
    '--scene-sky': t.sky, '--scene-sky2': t.sky2, '--scene-hill': t.hill, '--scene-hill2': t.hill2,
    '--scene-accent': t.accent, '--scene-water': t.water, '--scene-water2': t.water2,
  }).filter(([, v]) => v).map(([k, v]) => `${k}:${v}`).join(';');
  return `<div class="ph-scene" style="${esc(vars)}" role="img" aria-label="${esc(label)}">${label ? `<span class="ph-scene__label">${esc(label)}</span>` : ''}</div>`;
}

// 仮の人物の絵（胸上の枠）
export function personFrame(person, { label = '仮の絵', silhouette = false } = {}) {
  const c = (person && person.colors) || {};
  const vars = silhouette ? '' : Object.entries({ '--person-bg': c.bg, '--person-bg2': c.bg2, '--person-fg': c.fg })
    .filter(([, v]) => v).map(([k, v]) => `${k}:${v}`).join(';');
  const name = silhouette ? 'まだ出会っていない人物' : `${person ? person.name : ''}（${label}）`;
  return `<div class="ph-person${silhouette ? ' silhouette' : ''}" style="${esc(vars)}" role="img" aria-label="${esc(name)}"><span class="ph-person__label">${esc(silhouette ? '？' : label)}</span></div>`;
}

export function basisTag(key) {
  if (!BASIS[key]) return '';
  return `<span class="basis basis--${esc(key)}">${esc(BASIS[key])}</span>`;
}

export function fmtMin(sec) {
  if (sec < 60) return '1分以内';
  return `${Math.ceil(sec / 60)}分`;
}

export function fmtDate(iso) {
  try {
    const d = new Date(iso);
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
  } catch (e) { return ''; }
}

// 下から出る板
export function openSheet(title, bodyHtml, { onMount } = {}) {
  const prev = document.activeElement;
  const back = document.createElement('div');
  back.className = 'sheet-backdrop';
  back.innerHTML = `<div class="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title">
    <div class="sheet__head"><h2 id="sheet-title">${esc(title)}</h2>
    <button class="iconbtn" type="button" data-close aria-label="閉じる">${icon('close')}</button></div>
    <div class="sheet__body">${bodyHtml}</div></div>`;
  function close() {
    back.remove();
    document.removeEventListener('keydown', onKey);
    if (prev && prev.focus) prev.focus();
  }
  function onKey(e) { if (e.key === 'Escape') close(); }
  back.addEventListener('click', (e) => {
    if (e.target === back || e.target.closest('[data-close]')) close();
  });
  document.addEventListener('keydown', onKey);
  document.body.appendChild(back);
  back.querySelector('[data-close]').focus();
  if (onMount) onMount(back.querySelector('.sheet'), close);
  return close;
}
