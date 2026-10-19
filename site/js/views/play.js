// 再生：背景全面・藍の会話欄・右上に話者の胸上・名前札。音声（無ければ見積もり）に合わせて自動で進む。
// 画面を触っただけでは進まない（会話欄や背景に押す仕掛けを付けない）。
import { getCatalog, getPeopleMap } from '../data.js';
import { esc, scene, personFrame, icon, fmtMin, openSheet, basisTag } from '../ui.js';
import { reducedMotion, applySettings } from '../store.js';

const SUB_SIZES = [['m', '標準'], ['l', '大'], ['xl', '特大']];
const SPEEDS = [0.8, 1, 1.25, 1.5, 2];

function speakerInfo(line, people) {
  if (!line) return { name: '', person: people.guide };
  if (line.speaker === 'narration') return { name: '語り', person: people.guide };
  const p = people[line.speaker];
  return { name: p ? p.name : line.speaker, person: p || people.guide };
}

export async function render(root, id, ctx, intent) {
  const { player, state } = ctx;
  const people = await getPeopleMap();

  // 聴き終わりの直後（「もう一度」以外）は聴き終わりの画面
  if (!(intent && intent.play) && player.finished && player.story && player.story.id === id && ctx.lastFinale && ctx.lastFinale.storyId === id) {
    return renderFinale(root, ctx, people);
  }

  await ctx.ensureLoaded(id);
  const s = player.story;
  const resumedAt = player.elapsed;

  root.innerHTML = `
  <section class="play" aria-label="再生：${esc(s.placeShort)}">
    <div class="play__bg">${scene(s, '仮の景色')}</div>
    <header class="play__top">
      <a class="iconbtn" href="#story/${esc(s.id)}" aria-label="再生画面を閉じる（再生は続きます）">${icon('close')}</a>
      <div class="play__heading">
        <p class="play__title">${esc(s.placeShort)}　${esc(s.title)}</p>
        <div class="bar" aria-hidden="true"><span data-bar></span></div>
        <p class="play__time" data-time></p>
      </div>
    </header>
    <div class="play__bust" data-bust aria-hidden="true"></div>
    <div class="play__middle"><p class="play__notice" data-notice hidden></p></div>
    <div class="play__box">
      <div class="stage-box">
        <span class="nametag" data-name></span>
        <p class="stage-box__text" data-text aria-live="polite"></p>
      </div>
    </div>
    <div class="play__controls" role="group" aria-label="再生の操作">
      <button class="ctl" type="button" data-act="back30" aria-label="30秒戻す">${icon('back30')}<span>30秒戻し</span></button>
      <button class="ctl ctl--main" type="button" data-act="toggle"></button>
      <button class="ctl" type="button" data-act="log">${icon('log')}<span>ログ</span></button>
      <button class="ctl" type="button" data-act="more">${icon('more')}<span>その他</span></button>
    </div>
  </section>`;

  const el = {
    bust: root.querySelector('[data-bust]'),
    name: root.querySelector('[data-name]'),
    text: root.querySelector('[data-text]'),
    bar: root.querySelector('[data-bar]'),
    time: root.querySelector('[data-time]'),
    toggle: root.querySelector('[data-act="toggle"]'),
    notice: root.querySelector('[data-notice]'),
  };

  let lastSpeaker = null;
  function paintLine() {
    const l = player.line;
    const info = speakerInfo(l, people);
    el.name.textContent = info.name;
    el.text.textContent = l ? l.text : '';
    el.text.classList.remove('is-new');
    void el.text.offsetWidth;
    el.text.classList.add('is-new');
    const key = info.person ? info.person.id : '';
    if (key !== lastSpeaker) {
      el.bust.innerHTML = personFrame(info.person, { label: '仮の絵' });
      lastSpeaker = key;
    }
  }
  function paintTime() {
    const total = player.total || 1;
    el.bar.parentElement.style.setProperty('--value', `${(player.elapsed / total) * 100}%`);
    el.bar.style.setProperty('--value', `${(player.elapsed / total) * 100}%`);
    el.time.textContent = `あと${fmtMin(player.remaining)}（${player.index + 1}/${player.lines.length}）`;
  }
  function paintState() {
    el.toggle.innerHTML = `${icon(player.playing ? 'pause' : 'play')}<span>${player.playing ? '一時停止' : '再生'}</span>`;
    el.toggle.setAttribute('aria-label', player.playing ? '一時停止' : '再生');
    if (player.playing) el.notice.hidden = true;
  }

  const onLine = () => { paintLine(); paintTime(); };
  const onTick = () => paintTime();
  const onState = () => { paintState(); paintTime(); };
  player.addEventListener('line', onLine);
  player.addEventListener('tick', onTick);
  player.addEventListener('state', onState);

  root.querySelector('.play__controls').addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const act = b.dataset.act;
    if (act === 'toggle') player.toggle();
    else if (act === 'back30') player.seekBy(-30);
    else if (act === 'log') openLog(player, people);
    else if (act === 'more') openMore(ctx);
  });

  paintLine();
  paintTime();
  paintState();

  if (intent && intent.play) {
    player.play();
  } else if (!player.playing) {
    el.notice.hidden = false;
    el.notice.textContent = resumedAt > 0
      ? `続きから再開できます（あと${fmtMin(player.remaining)}）。「再生」を押してください`
      : '「再生」を押すと始まります';
  }

  return {
    unmount() {
      player.removeEventListener('line', onLine);
      player.removeEventListener('tick', onTick);
      player.removeEventListener('state', onState);
    },
  };
}

function openLog(player, people) {
  const items = player.lines.slice(0, player.index + 1).map((l, i) => {
    const info = speakerInfo(l, people);
    return `<li class="log-item${i === player.index ? ' is-current' : ''}"><span class="log-item__who">${esc(info.name)}</span><span>${esc(l.text)}</span></li>`;
  }).join('');
  openSheet('会話ログ', `<ol class="log-list">${items}</ol>`, {
    onMount(sheet) {
      const cur = sheet.querySelector('.is-current');
      if (cur) cur.scrollIntoView({ block: 'nearest' });
    },
  });
}

function openMore(ctx) {
  const { state, persist, player } = ctx;
  const seg = (name, items, cur) => `<div class="seg" role="group" aria-label="${esc(name)}">${items.map(([v, label]) =>
    `<button type="button" data-${name === '字幕の大きさ' ? 'subsize' : 'speed'}="${esc(v)}" aria-pressed="${String(v) === String(cur)}">${esc(label)}</button>`).join('')}</div>`;
  const body = `
    <div class="opt-group"><h3>字幕の大きさ</h3>${seg('字幕の大きさ', SUB_SIZES, state.settings.sub)}</div>
    <div class="opt-group"><h3>速度（倍）</h3>${seg('速度', SPEEDS.map((v) => [v, String(v)]), state.settings.speed)}</div>
    <p class="muted small">音声がまだ無いため、文字数から長さを見積もって進めています（仮の動き）。</p>`;
  openSheet('その他', body, {
    onMount(sheet) {
      sheet.addEventListener('click', (e) => {
        const sb = e.target.closest('[data-subsize]');
        const sp = e.target.closest('[data-speed]');
        if (sb) {
          state.settings.sub = sb.dataset.subsize;
          applySettings();
        } else if (sp) {
          state.settings.speed = Number(sp.dataset.speed);
          player.setSpeed(state.settings.speed);
        } else return;
        persist();
        const group = (sb || sp).parentElement;
        group.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b === (sb || sp))));
      });
    },
  });
}

// ---------- 聴き終わり：景色→人物の一言→問い1行→図鑑カードが「記録されました」とめくれて収まる ----------
async function renderFinale(root, ctx, people) {
  const { player } = ctx;
  const s = player.story;
  const cat = await getCatalog();
  const first = !!ctx.lastFinale.firstTime;
  const animate = first && !reducedMotion();
  const speaker = people[(s.finale && s.finale.speaker) || 'guide'] || people.guide;
  const nextStory = cat.stories.find((x) => x.id !== s.id && !(ctx.state.records.places[x.id] && ctx.state.records.places[x.id].heard));
  const nextHtml = nextStory
    ? `<a class="card card-link" href="#story/${esc(nextStory.id)}"><div class="card__body"><p class="small muted">次の物語の提案</p><p class="card__title mincho">${esc(nextStory.place)}</p><p>${esc(nextStory.question)}</p></div></a>`
    : `<div><p class="small muted">次の物語の提案</p><p>ほかの物語は準備中です（${cat.planned ? cat.planned.length : 0}本予定）。</p></div>`;
  const d = (i) => (animate ? `style="animation-delay:${i * 700}ms"` : 'style="animation:none"');

  root.innerHTML = `
  <section class="play play--finale" aria-label="聴き終わり：${esc(s.placeShort)}">
    <div class="play__bg">${scene(s, '仮の景色')}</div>
    <header class="play__top">
      <a class="iconbtn" href="#home" aria-label="閉じてホームへ">${icon('close')}</a>
      <div class="play__heading"><p class="play__title">${esc(s.placeShort)}　聴き終わりました</p></div>
    </header>
    <div class="finale" data-finale>
      ${animate ? '<button class="btn btn-text finale__skip" type="button" data-act="skip">スキップ</button>' : ''}
      <div class="finale__step finale__quote" ${d(1)}>${personFrame(speaker)}<div class="stage-box"><span class="nametag">${esc(speaker.name)}</span><p class="stage-box__text">${esc(s.finale ? s.finale.quote : '')}</p></div></div>
      <p class="finale__step finale__q" ${d(2)}>${esc(s.question)}</p>
      <div class="finale__step record" ${d(3)}>
        <div class="record__card${animate ? ' is-flipping' : ''}" data-card style="${animate ? 'animation-delay:2100ms' : ''}">
          <div class="record__face">${scene(s, '')}<p class="record__name">${esc(s.place)}</p></div>
          <div class="record__face record__face--back" aria-hidden="true">図鑑</div>
        </div>
        <p class="record__msg" role="status">${first ? '図鑑に記録されました' : '図鑑に記録ずみです'}（人物も）　${basisTag(s.basis)}</p>
      </div>
      <div class="finale__step finale__panel" ${d(4)}>
        ${nextHtml}
        <a class="btn btn-primary btn-block" href="#zukan">図鑑を見る</a>
        <button class="btn btn-secondary btn-block" type="button" data-act="again">もう一度聴く</button>
      </div>
    </div>
  </section>`;

  const fin = root.querySelector('[data-finale]');
  // 最後の案内（図鑑を見る）が画面の下に隠れないよう、出そろったら下端まで送る
  const toEnd = () => { fin.scrollTop = fin.scrollHeight; };
  const panel = fin.querySelector('.finale__panel');
  if (animate) panel.addEventListener('animationend', () => { toEnd(); fin.querySelector('[data-act="skip"]')?.remove(); }, { once: true });
  else requestAnimationFrame(toEnd);
  fin.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    if (b.dataset.act === 'skip') {
      fin.querySelectorAll('.finale__step, [data-card]').forEach((n) => { n.style.animation = 'none'; });
      b.remove();
      toEnd();
      fin.querySelector('[href="#zukan"]').focus();
    } else if (b.dataset.act === 'again') {
      ctx.lastFinale = null;
      ctx.go(`#play/${s.id}`, { play: true });
    }
  });
  return null;
}
