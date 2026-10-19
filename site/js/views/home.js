// ホーム：大きな景色・地域名・案内役・主ボタン1つ・今日の歩数（試験表示）とレベル
import { getCatalog, getPeopleMap } from '../data.js';
import { esc, scene, personFrame, fmtMin } from '../ui.js';

// 歩数はWebでは背景で数えられないため、日付から作る模擬値（実測と混ぜない）
function mockSteps() {
  const d = new Date();
  const seed = d.getFullYear() * 400 + (d.getMonth() + 1) * 32 + d.getDate();
  return 2400 + ((seed * 7919) % 5200);
}

export async function render(root, _arg, ctx) {
  const [cat, people] = await Promise.all([getCatalog(), getPeopleMap()]);
  const { state, player } = ctx;
  const p = state.progress;
  const resumeStory = p && cat.stories.find((s) => s.id === p.storyId);
  // おすすめ：まだ聴いていない物語のうち最初のもの。全部聴いていれば最初の物語
  const recommend = cat.stories.find((s) => !(state.records.places[s.id] && state.records.places[s.id].heard)) || cat.stories[0];
  const featured = resumeStory || recommend;
  const guide = people.guide;

  let primary;
  if (resumeStory) {
    const remain = player.story && player.story.id === resumeStory.id ? player.remaining : resumeStory.durationMin * 60;
    primary = `<button class="btn btn-primary btn-block" type="button" data-act="resume">続きを聴く（あと${esc(fmtMin(remain))}）</button>`;
  } else {
    primary = `<a class="btn btn-primary btn-block" href="#story/${esc(recommend.id)}">おすすめ：${esc(recommend.placeShort)}の物語</a>`;
  }

  const steps = mockSteps();
  const levelPct = Math.round(((steps % 3000) / 3000) * 100);
  // しおりの一言（settei.md の話し方：です・ます、短く、煽らない）
  const say = resumeStory
    ? `${resumeStory.placeShort}の話の続きを、ここから一緒に聴きましょう。`
    : `今日は${recommend.area}の話をお持ちしました。`;

  root.innerHTML = `
  <div class="screen">
    <section class="home-hero">
      ${scene(featured, { which: 'home', eager: true, alt: `${featured.place}の夕方の景色（AIで描いた絵）` })}
      <div class="home-hero__veil" aria-hidden="true"></div>
      <div class="home-guide">${personFrame(guide, { bust: true, alt: `案内役のしおり（架空の人物）` })}</div>
      <div class="home-hero__text"><div class="wrap">
        <p class="home-hero__sub">${esc(featured.pref)}</p>
        <h1 class="home-hero__area mincho">${esc(featured.area)}</h1>
      </div></div>
    </section>
    <div class="wrap home-main">
      <div class="home-guide-say"><p><span class="home-guide-say__name">${esc(guide.name)}</span>${esc(say)}</p></div>
      ${primary}
      <div class="home-steps" aria-label="今日の歩数とレベル（試験表示）">
        <span class="home-steps__num">今日の歩数 ${steps.toLocaleString('ja-JP')}歩</span>
        <div class="bar" role="progressbar" aria-label="次のレベルまで" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${levelPct}" style="--value:${levelPct}%"><span></span></div>
        <span class="home-steps__note">試験表示：Webでは歩数を数えられないため模擬の値です（実測ではありません）・レベル1</span>
      </div>
    </div>
  </div>`;

  root.querySelector('[data-act="resume"]')?.addEventListener('click', () => {
    ctx.go(`#play/${resumeStory.id}`, { play: true });
  });
}
