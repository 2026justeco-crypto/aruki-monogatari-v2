// 図鑑：場所／人物／旅の日記。地域ごとの「1/○」。未発見はシルエットと地名だけ。
import { getCatalog, getPeopleMap } from '../data.js';
import { esc, scene, personFrame, basisTag, personBasisTags, fmtDate, openSheet, sourceList } from '../ui.js';

let tab = 'place';

function marks(rec) {
  const out = [];
  if (rec && rec.visited) out.push('<span class="mark mark--koke">現地で訪れた</span>');
  if (rec && rec.heard) out.push('<span class="mark mark--ai">聴いた</span>');
  return out.join('');
}

export async function render(root, _arg, ctx) {
  const [cat, people] = await Promise.all([getCatalog(), getPeopleMap()]);
  const { state } = ctx;
  // 分母は今ある物語だけ（準備中は数えない）
  const all = cat.stories;

  function places() {
    const regions = cat.regions.filter((r) => all.some((x) => x.region === r.id));
    return regions.map((r) => {
      const items = all.filter((x) => x.region === r.id);
      const got = items.filter((x) => state.records.places[x.id] && state.records.places[x.id].heard).length;
      const pct = Math.round((got / items.length) * 100);
      return `<section class="zukan-region section" aria-label="${esc(r.name)}">
        <div class="zukan-region__head"><h2>${esc(r.name)}</h2><span class="zukan-region__count">${got}/${items.length}</span></div>
        <div class="bar bar--reward" role="progressbar" aria-label="${esc(r.name)}の集まり具合" aria-valuemin="0" aria-valuemax="${items.length}" aria-valuenow="${got}" style="--value:${pct}%"><span></span></div>
        <ul class="zcard-grid">${items.map((x) => {
          const rec = state.records.places[x.id];
          const found = rec && rec.heard;
          if (!found) {
            return `<li class="card zcard zcard--locked">${scene(x, { alt: '' })}<div class="zcard__body"><p class="zcard__name">${esc(x.place)}</p><p class="small muted">${esc(x.pref)}・まだ聴いていません</p></div></li>`;
          }
          return `<li class="card zcard"><a class="card-link" href="#story/${esc(x.id)}">${scene(x, { alt: `${x.place}の景色` })}</a><div class="zcard__body">
            <p class="zcard__name">${esc(x.place)}</p>
            <div class="zcard__marks">${marks(rec)}${basisTag(x.basis)}</div>
            <p class="small muted">${esc(fmtDate(rec.heard))}</p></div></li>`;
        }).join('')}</ul>
      </section>`;
    }).join('');
  }

  function persons() {
    const list = Object.values(people);
    const got = list.filter((p) => state.records.people[p.id] && state.records.people[p.id].heard).length;
    return `<section class="zukan-region section" aria-label="人物">
      <div class="zukan-region__head"><h2>人物</h2><span class="zukan-region__count">${got}/${list.length}</span></div>
      <ul class="zcard-grid">${list.map((p) => {
        const rec = state.records.people[p.id];
        if (!(rec && rec.heard)) {
          return `<li class="card zcard zcard--locked">${personFrame(p, { silhouette: true })}<div class="zcard__body"><p class="zcard__name">？？？</p><p class="small muted">物語の中で出会えます</p></div></li>`;
        }
        return `<li class="card zcard zcard--person"><button class="zcard__open" type="button" data-person="${esc(p.id)}" aria-haspopup="dialog">${personFrame(p, { bust: true, alt: '' })}<span class="zcard__body">
          <span class="zcard__name">${esc(p.name)}</span>
          <span class="small muted">${p.born ? `${esc(p.born)}〜${esc(p.died)}年` : '架空の人物'}</span>
          <span class="zcard__marks">${marks(rec)}${personBasisTags(p)}</span>
          <span class="zcard__more small">くわしく見る</span></span></button></li>`;
      }).join('')}</ul>
    </section>`;
  }

  function diary() {
    if (!state.diary.length) return '<p class="empty section">物語を聴き終えると、ここに旅の日記が残ります。</p>';
    return `<ol class="diary-list section">${state.diary.map((d) => {
      const s = cat.stories.find((x) => x.id === d.storyId);
      return `<li class="card diary-item"><time datetime="${esc(d.at)}">${esc(fmtDate(d.at))}</time>
        <p class="mincho">${esc(s ? s.place : d.storyId)}</p>${d.quote ? `<p class="small">「${esc(d.quote)}」</p>` : ''}</li>`;
    }).join('')}</ol>`;
  }

  function paint() {
    root.innerHTML = `<div class="screen"><div class="wrap">
      <div class="screen-head"><h1 class="mincho">図鑑</h1>
        <div class="zukan-legend"><span class="mark mark--koke">現地で訪れた</span><span class="mark mark--ai">聴いた</span></div>
        <div class="zukan-legend">${basisTag('shiryo')}${basisTag('kaishaku')}${basisTag('sousaku')}</div>
      </div>
      <div class="seg" role="tablist" aria-label="図鑑の種類">
        <button type="button" role="tab" data-tab="place" aria-selected="${tab === 'place'}">場所</button>
        <button type="button" role="tab" data-tab="person" aria-selected="${tab === 'person'}">人物</button>
        <button type="button" role="tab" data-tab="diary" aria-selected="${tab === 'diary'}">旅の日記</button>
      </div>
      <div role="tabpanel">${tab === 'place' ? places() : tab === 'person' ? persons() : diary()}</div>
    </div></div>`;
  }

  function onClick(e) {
    const pc = e.target.closest('[data-person]');
    if (pc) { openPerson(people[pc.dataset.person]); return; }
    const t = e.target.closest('[data-tab]');
    if (!t) return;
    tab = t.dataset.tab;
    paint();
    root.querySelector(`[data-tab="${tab}"]`)?.focus();
  }
  root.addEventListener('click', onClick);
  paint();
  return { unmount() { root.removeEventListener('click', onClick); } };
}

// 人物カードを開く：史料にもとづく点／解釈した点（または創作）と出典
function openPerson(p) {
  if (!p) return;
  const c = p.card || {};
  const srcIndex = Object.fromEntries((p.sources || []).map((x) => [x.id, x]));
  const cite = (ids) => (ids || []).filter((id) => srcIndex[id]).map((id) => `<a href="${esc(srcIndex[id].url)}" target="_blank" rel="noopener" class="cite">[${esc(id)}]</a>`).join('');
  const shiryo = (c.shiryo || []).length ? `<section class="pcard__sec"><h3>${basisTag('shiryo')} 史料にもとづく点</h3><ul class="pcard__list">${c.shiryo.map((x) => `<li>${esc(x.point)} ${cite(x.sources)}</li>`).join('')}</ul></section>` : '';
  const kaishaku = (c.kaishaku || []).length ? `<section class="pcard__sec"><h3>${basisTag('kaishaku')} 解釈した点（肖像を写していないため）</h3><ul class="pcard__list">${c.kaishaku.map((x) => `<li><b>${esc(x.point)}</b>：${esc(x.decision)}</li>`).join('')}</ul></section>` : '';
  const creative = (c.creative || []).length ? `<section class="pcard__sec"><h3>${basisTag('sousaku')} 創作の人物</h3><ul class="pcard__list">${c.creative.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></section>` : '';
  const srcs = (p.sources || []).length ? `<section class="pcard__sec"><h3>出典</h3>${sourceList(p.sources.map((x) => ({ ...x, label: `[${x.id}] ${x.label}` })))}</section>` : '';
  const body = `<div class="pcard">
    <div class="pcard__head">${personFrame(p, { bust: true, alt: `${p.name}の絵` })}
      <div><p class="small muted">${esc(p.reading || '')}</p><p class="pcard__role">${esc(p.role || p.desc || '')}</p>
      <p class="zcard__marks">${personBasisTags(p)}</p></div></div>
    ${c.summary ? `<p>${esc(c.summary)}</p>` : ''}
    ${shiryo}${kaishaku}${creative}
    ${c.artNote ? `<p class="small muted">${esc(c.artNote)}</p>` : ''}
    ${srcs}
  </div>`;
  openSheet(p.name, body);
}
