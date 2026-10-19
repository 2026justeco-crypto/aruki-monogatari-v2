// 設定：文字の大きさ（3段）・声の音量・動きを減らす・説明の難しさ（今は表示だけ）
// 設定を変えても再生位置は失わない（再生は画面と別に動いている）。
import { applySettings } from '../store.js';
import { esc } from '../ui.js';

const TEXT = [['m', '標準'], ['l', '大'], ['xl', '特大']];
const MOTION = [['system', '自動'], ['reduce', '減らす'], ['full', 'そのまま']];
const LEVEL = [['easy', 'やさしい'], ['normal', 'ふつう'], ['deep', 'くわしい']];

function seg(key, items, cur, disabled = false) {
  return `<div class="seg" role="group" aria-labelledby="h-${key}" ${disabled ? 'aria-disabled="true"' : ''}>${items.map(([v, label]) =>
    `<button type="button" data-key="${key}" data-val="${esc(v)}" aria-pressed="${v === cur}" ${disabled ? 'disabled' : ''}>${esc(label)}</button>`).join('')}</div>`;
}

export async function render(root, _arg, ctx) {
  const { state, persist, player } = ctx;
  const s = state.settings;
  root.innerHTML = `<div class="screen"><div class="wrap">
    <div class="screen-head"><h1 class="mincho">設定</h1></div>
    <div class="section">
      <section class="card setting"><h2 id="h-text">文字の大きさ</h2>${seg('text', TEXT, s.text)}</section>
      <section class="card setting"><h2 id="h-volume"><label for="vol">声の音量</label></h2>
        <input id="vol" type="range" min="0" max="100" step="5" value="${Math.round(s.volume * 100)}" aria-describedby="vol-v">
        <p class="small muted" id="vol-v">${Math.round(s.volume * 100)}%</p></section>
      <section class="card setting"><h2 id="h-motion">動きを減らす</h2>${seg('motion', MOTION, s.motion)}<p class="small muted">自動＝端末側の「動きを減らす」設定に合わせます。</p></section>
      <section class="card setting"><h2 id="h-level">説明の難しさ</h2>${seg('level', LEVEL, s.level, true)}
        <p class="small muted">いまは表示だけです（物語の文章はまだ切り替わりません）。</p></section>
    </div>
  </div></div>`;

  function onClick(e) {
    const b = e.target.closest('[data-key]');
    if (!b || b.disabled) return;
    s[b.dataset.key] = b.dataset.val;
    applySettings();
    persist();
    b.parentElement.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
  }
  const vol = root.querySelector('#vol');
  function onInput() {
    s.volume = Number(vol.value) / 100;
    player.setVolume(s.volume);
    root.querySelector('#vol-v').textContent = `${vol.value}%`;
  }
  root.addEventListener('click', onClick);
  vol.addEventListener('input', onInput);
  vol.addEventListener('change', () => persist());
  return { unmount() { root.removeEventListener('click', onClick); } };
}
