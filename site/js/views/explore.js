// 探す：場所（地方→都府県）・時代（年表の帯）・人物 の3つの切り替え
import { getCatalog, getPeopleMap } from '../data.js';
import { esc, scene, personFrame } from '../ui.js';

let mode = 'place';          // 画面を離れても切り替えを覚えておく
let openRegion = null;
let openPref = null;
let openEra = null;

function storyCard(s, people) {
  const names = (s.people || []).map((id) => people[id]).filter((p) => p && p.historical).map((p) => p.name);
  return `<a class="card card-link story-card" href="#story/${esc(s.id)}">
    ${scene(s)}
    <div class="card__body">
      <p class="story-card__place">${esc(s.place)}</p>
      <p class="story-card__q">${esc(s.question)}</p>
      <div class="card__meta">
        <span>約${esc(s.durationMin)}分</span><span>${esc(s.language)}</span><span>${esc(s.onSite)}</span>
        ${names.length ? `<span>${esc(names.join('・'))}</span>` : ''}
        <span>素材：台本${esc(s.assets.script)}・音声${esc(s.assets.audio)}・絵${esc(s.assets.art)}</span>
      </div>
    </div>
  </a>`;
}

export async function render(root, _arg, ctx) {
  const [cat, people] = await Promise.all([getCatalog(), getPeopleMap()]);

  function body() {
    if (mode === 'place') {
      return `<div class="region-list">${cat.regions.map((r) => {
        const inRegion = cat.stories.filter((s) => s.region === r.id);
        const open = openRegion === r.id;
        if (!inRegion.length) {
          return `<div class="region"><button type="button" disabled><span>${esc(r.name)}</span><span class="region__count">0本</span></button></div>`;
        }
        const prefs = r.prefs.map((pf) => {
          const n = inRegion.filter((s) => s.pref === pf).length;
          return `<button class="pref-chip" type="button" data-pref="${esc(pf)}" aria-pressed="${openPref === pf}" ${n ? '' : 'disabled'}>${esc(pf)}（${n}）</button>`;
        }).join('');
        const shown = openPref ? inRegion.filter((s) => s.pref === openPref) : [];
        return `<div class="region">
          <button type="button" data-region="${esc(r.id)}" aria-expanded="${open}"><span>${esc(r.name)}</span><span class="region__count">${inRegion.length}本　${open ? '▲' : '▼'}</span></button>
          ${open ? `<div class="region__body"><div class="pref-row">${prefs}</div>
            ${shown.length ? `<div class="story-grid">${shown.map((s) => storyCard(s, people)).join('')}</div>` : '<p class="muted small">都府県を選んでください</p>'}
          </div>` : ''}
        </div>`;
      }).join('')}</div>`;
    }
    if (mode === 'era') {
      const counts = Object.fromEntries(cat.eras.map((e) => [e.id, cat.stories.filter((s) => s.era === e.id).length]));
      const sel = openEra || (cat.eras.find((e) => counts[e.id]) || cat.eras[0]).id;
      const selEra = cat.eras.find((e) => e.id === sel);
      const list = cat.stories.filter((s) => s.era === sel);
      return `<div class="timeline" role="group" aria-label="年表（縄文〜令和）"><div class="timeline__band">
        ${cat.eras.map((e) => `<button class="era" type="button" data-era="${esc(e.id)}" aria-pressed="${e.id === sel}" aria-label="${esc(e.name)}時代（${counts[e.id]}本）">${esc(e.name)}${counts[e.id] ? '<span class="era__dot" aria-hidden="true"></span>' : ''}</button>`).join('')}
      </div></div>
      <p class="muted small">点のある時代に物語があります</p>
      <h2 class="mincho">${esc(selEra.name)}時代</h2>
      ${list.length ? `<div class="story-grid">${list.map((s) => storyCard(s, people)).join('')}</div>` : '<p class="muted">この時代の物語はまだありません</p>'}`;
    }
    // 人物
    const persons = Object.values(people).filter((p) => p.historical);
    return `<div class="person-list">${persons.map((p) => {
      const st = cat.stories.filter((s) => (s.people || []).includes(p.id));
      const target = st[0];
      return `<a class="person-row" href="${target ? `#story/${esc(target.id)}` : '#explore'}">
        ${personFrame(p, { alt: '' })}
        <span><span class="person-row__name">${esc(p.name)}</span><br><span class="muted small">${esc(p.reading)}<br>${esc(p.born)}〜${esc(p.died)}年</span></span>
        <span class="muted small">${st.map((s) => esc(s.placeShort)).join('・')}</span>
      </a>`;
    }).join('')}</div>`;
  }

  function paint() {
    root.innerHTML = `<div class="screen"><div class="wrap">
      <div class="screen-head"><h1 class="mincho">探す</h1><p class="muted">場所・時代・人物のどこからでも</p></div>
      <div class="explore-seg"><div class="seg" role="tablist" aria-label="探し方">
        <button type="button" role="tab" data-mode="place" aria-selected="${mode === 'place'}">場所</button>
        <button type="button" role="tab" data-mode="era" aria-selected="${mode === 'era'}">時代</button>
        <button type="button" role="tab" data-mode="person" aria-selected="${mode === 'person'}">人物</button>
      </div></div>
      <div class="section" style="margin-top:var(--sp-2)" role="tabpanel">${body()}</div>
    </div></div>`;
    // 年表は選んでいる時代が見える位置まで横に送る（ページ全体は動かさない）
    const tl = root.querySelector('.timeline');
    const cur = tl && tl.querySelector('.era[aria-pressed="true"]');
    if (tl && cur) tl.scrollLeft = cur.offsetLeft - (tl.clientWidth - cur.offsetWidth) / 2;
  }

  root.addEventListener('click', onClick);
  function onClick(e) {
    const m = e.target.closest('[data-mode]');
    if (m) { mode = m.dataset.mode; paint(); root.querySelector(`[data-mode="${mode}"]`)?.focus(); return; }
    const r = e.target.closest('[data-region]');
    if (r) {
      openRegion = openRegion === r.dataset.region ? null : r.dataset.region;
      openPref = null;
      if (openRegion) {
        // 物語のある都府県が1つだけなら最初から開いておく
        const prefs = [...new Set(cat.stories.filter((s) => s.region === openRegion).map((s) => s.pref))];
        if (prefs.length === 1) openPref = prefs[0];
      }
      paint();
      root.querySelector(`[data-region="${r.dataset.region}"]`)?.focus();
      return;
    }
    const pf = e.target.closest('[data-pref]');
    if (pf) { openPref = pf.dataset.pref; paint(); root.querySelector(`[data-pref="${pf.dataset.pref}"]`)?.focus(); return; }
    const er = e.target.closest('[data-era]');
    if (er) { openEra = er.dataset.era; paint(); root.querySelector(`[data-era="${er.dataset.era}"]`)?.focus(); }
  }
  paint();
  return { unmount() { root.removeEventListener('click', onClick); } };
}
