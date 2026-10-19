// 詳細：大きな景色・問い1行・登場人物の顔・所要時間・出典・主ボタン「聴く」
import { getStory, getPeopleMap } from '../data.js';
import { esc, scene, personFrame, personBasisTags, icon, fmtMin, sourceList, disclaimerList } from '../ui.js';

export async function render(root, id, ctx) {
  const [s, people] = await Promise.all([getStory(id), getPeopleMap()]);
  if (!s) {
    root.innerHTML = `<div class="wrap"><div class="screen-head"><h1>物語が見つかりません</h1><p><a href="#explore">探すへ戻る</a></p></div></div>`;
    return null;
  }
  const { state, player } = ctx;
  const inProgress = state.progress && state.progress.storyId === s.id;
  const remain = inProgress && player.story && player.story.id === s.id ? player.remaining : null;
  const heard = state.records.places[s.id] && state.records.places[s.id].heard;
  const faces = (s.people || []).map((pid) => people[pid]).filter(Boolean).map((p) => `
    <li class="face">${personFrame(p, { alt: '' })}<span class="face__name">${esc(p.name)}</span><span class="face__role small muted">${esc(p.historical ? `${p.born}〜${p.died}年` : '案内役・架空')}</span><span class="face__tags">${personBasisTags(p)}</span></li>`).join('');

  root.innerHTML = `
  <article class="screen">
    <div class="detail-hero">${scene(s, { eager: true })}
      <div class="detail-hero__top"><div class="wrap"><a class="backlink" href="#explore">${icon('back')}探す</a></div></div>
    </div>
    <div class="wrap">
      <header class="detail-head">
        <p class="muted">${esc(s.pref)}・${esc(s.area)}・${esc(s.yearLabel)}</p>
        <h1 class="detail-head__place mincho">${esc(s.place)}</h1>
        <p>${esc(s.title)}</p>
        ${heard ? '<p><span class="mark mark--ai">聴いた</span></p>' : ''}
      </header>
      <p class="detail-q section" style="margin-top:var(--sp-4)">${esc(s.question)}</p>
      <section class="section" aria-labelledby="h-people"><h2 id="h-people">登場人物</h2><ul class="people-row">${faces}</ul>
        <p class="muted small">人物の絵はAIで新しく描いた想像図です。肖像画を写したものではありません。</p></section>
      <section class="section" aria-labelledby="h-meta"><h2 id="h-meta" class="visually-hidden">概要</h2>
        <dl class="meta-list">
          <div><dt>所要時間</dt><dd>約${esc(s.durationMin)}分</dd></div>
          <div><dt>言語</dt><dd>${esc(s.language)}</dd></div>
          <div><dt>聴ける場所</dt><dd>${esc(s.onSite)}</dd></div>
        </dl>
      </section>
      <section class="section" aria-labelledby="h-kubetsu"><h2 id="h-kubetsu">史実と創作の区別</h2>${disclaimerList(s)}</section>
      <section class="section" aria-labelledby="h-src"><h2 id="h-src">しらべた資料（出典）</h2>${sourceList(s.sources)}</section>
      <div class="detail-cta">
        <button class="btn btn-primary btn-block" type="button" data-act="listen">${inProgress ? `続きを聴く（あと${esc(fmtMin(remain ?? s.durationMin * 60))}）` : '聴く'}</button>
        ${inProgress ? '<button class="btn btn-text" type="button" data-act="restart">最初から聴く</button>' : ''}
      </div>
    </div>
  </article>`;

  root.querySelector('[data-act="listen"]').addEventListener('click', () => ctx.go(`#play/${s.id}`, { play: true }));
  root.querySelector('[data-act="restart"]')?.addEventListener('click', async () => {
    await ctx.ensureLoaded(s.id);
    player.seekTo(0);
    ctx.go(`#play/${s.id}`, { play: true });
  });
  return null;
}
