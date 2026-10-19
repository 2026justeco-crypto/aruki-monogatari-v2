// 入口：画面の切り替え（URLのハッシュ）・ミニプレーヤー・記録
import { state, persist, applySettings } from './store.js';
import { Player } from './player.js';
import { esc, icon, fmtMin } from './ui.js';
import * as home from './views/home.js';
import * as explore from './views/explore.js';
import * as story from './views/story.js';
import * as play from './views/play.js';
import * as zukan from './views/zukan.js';
import * as settings from './views/settings.js';

const VIEWS = { home, explore, story, play, zukan, settings };
const TAB_OF = { home: 'home', explore: 'explore', story: 'explore', play: null, zukan: 'zukan', settings: 'settings' };

const main = document.getElementById('main');
const mini = document.getElementById('mini');
const player = new Player();
player.setSpeed(state.settings.speed);
player.setVolume(state.settings.volume);

const ctx = {
  state,
  persist,
  player,
  intent: null,           // 画面の切り替えに添える意図（例：{ play: true }）
  lastFinale: null,       // 直前に聴き終えた物語 { storyId, firstTime }
  go(hash, intent = null) {
    ctx.intent = intent;
    if (location.hash === hash) render();
    else location.hash = hash;
  },
  async ensureLoaded(storyId) {
    if (player.story && player.story.id === storyId) return;
    const p = state.progress && state.progress.storyId === storyId ? state.progress : null;
    await player.load(storyId, p ? { index: p.index, t: p.t } : {});
  },
};

// ---------- 進行の保存 ----------
player.addEventListener('progress', () => {
  if (!player.story || player.finished) return;
  state.progress = { storyId: player.story.id, index: player.index, t: Math.round(player.t * 10) / 10, updatedAt: new Date().toISOString() };
  persist();
});

player.addEventListener('end', () => {
  const s = player.story;
  const now = new Date().toISOString();
  const firstTime = !(state.records.places[s.id] && state.records.places[s.id].heard);
  state.records.places[s.id] = { ...(state.records.places[s.id] || {}), heard: (state.records.places[s.id] || {}).heard || now };
  for (const pid of s.people || []) {
    state.records.people[pid] = { ...(state.records.people[pid] || {}), heard: (state.records.people[pid] || {}).heard || now };
  }
  state.diary.unshift({ at: now, storyId: s.id, quote: s.finale ? s.finale.quote : '' });
  state.diary = state.diary.slice(0, 200);
  state.progress = null;
  persist();
  ctx.lastFinale = { storyId: s.id, firstTime };
  updateMini();
  // 再生画面を見ていれば、その場で聴き終わりを出す（自動で次は再生しない）
  if (currentRoute.name === 'play') render();
});

player.addEventListener('state', updateMini);
player.addEventListener('tick', updateMiniBar);
player.addEventListener('line', updateMini);

// ---------- ミニプレーヤー ----------
function miniVisible() {
  if (currentRoute.name === 'play') return false;
  if (player.loaded && !player.finished && (player.playing || player.elapsed > 0)) return true;
  return false;
}

function updateMini() {
  const show = miniVisible();
  mini.hidden = !show;
  document.body.classList.toggle('has-mini', show);
  if (!show) return;
  const s = player.story;
  mini.innerHTML = `
    <div class="bar" aria-hidden="true"><span></span></div>
    <a class="mini__open" href="#play/${esc(s.id)}" aria-label="再生画面を開く：${esc(s.placeShort)}">
      <span class="mini__title">${esc(s.placeShort)}　${esc(s.title)}</span>
      <span class="mini__sub" data-mini-sub></span>
    </a>
    <button class="iconbtn" type="button" data-mini-toggle aria-label="${player.playing ? '一時停止' : '再生'}">${icon(player.playing ? 'pause' : 'play')}</button>`;
  updateMiniBar();
}

function updateMiniBar() {
  if (mini.hidden) return;
  const bar = mini.querySelector('.bar > span');
  const sub = mini.querySelector('[data-mini-sub]');
  const total = player.total || 1;
  if (bar) bar.style.setProperty('--value', `${(player.elapsed / total) * 100}%`);
  if (sub) sub.textContent = `${player.playing ? '再生中' : '一時停止中'}・あと${fmtMin(player.remaining)}`;
}

mini.addEventListener('click', (e) => {
  if (e.target.closest('[data-mini-toggle]')) player.toggle();
});

// ---------- 画面の切り替え ----------
let currentRoute = { name: 'home', arg: null };
let currentView = null;
let renderToken = 0;

function parseHash() {
  const h = decodeURIComponent(location.hash.replace(/^#/, ''));
  const [name, arg] = h.split('/');
  if (!VIEWS[name]) return { name: 'home', arg: null };
  return { name, arg: arg || null };
}

async function render() {
  const token = ++renderToken;
  const route = parseHash();
  if (currentView && currentView.unmount) { try { currentView.unmount(); } catch (e) { console.warn(e); } }
  currentView = null;
  currentRoute = route;
  document.body.dataset.route = route.name;
  const tab = TAB_OF[route.name];
  document.querySelectorAll('.tabbar a').forEach((a) => {
    if (a.dataset.tab === tab) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  updateMini();
  const intent = ctx.intent;
  ctx.intent = null;
  main.innerHTML = '<p class="loading">読み込み中…</p>';
  try {
    const view = VIEWS[route.name];
    const result = await view.render(main, route.arg, ctx, intent, () => token !== renderToken);
    if (token !== renderToken) { if (result && result.unmount) result.unmount(); return; }
    currentView = result || null;
  } catch (e) {
    if (token !== renderToken) return;
    console.error(e);
    main.innerHTML = `<div class="wrap"><div class="screen-head"><h1>表示できませんでした</h1><p>${esc(e.message)}</p><p><a href="#home">ホームへ戻る</a></p></div></div>`;
  }
  if (token !== renderToken) return;
  updateMini();
  window.scrollTo(0, 0);
  if (!(intent && intent.keepFocus)) main.focus({ preventScroll: true });
}

window.addEventListener('hashchange', render);

// 閉じる・裏に回る直前にも位置を残す（1秒ごとの保存の取りこぼしを減らす）
function saveNow() { if (player.loaded && !player.finished) player.dispatchEvent(new CustomEvent('progress')); }
window.addEventListener('pagehide', saveNow);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') saveNow(); });

// ---------- はじめに ----------
applySettings();
(async () => {
  // 途中の物語があれば、ミニプレーヤーとホームの「続きを聴く」のために読み込んでおく（自動では鳴らさない）
  if (state.progress && state.progress.storyId) {
    try { await ctx.ensureLoaded(state.progress.storyId); } catch (e) { console.warn('続きの読み込みに失敗', e); state.progress = null; persist(); }
  }
  render();
})();

// 確かめ用（Playwrightから位置を動かす）
window.__aruki = { player, state };
