// 再生の仕組み（画面とは別に動き続ける。ミニプレーヤーと再生画面が同じものを見る）
// 音声ファイルがある会話は音声の終わりで次へ。無い会話は文字数から長さを見積もって進む（仮の動き）。
import { getScript, getStory } from './data.js';

const SEC_PER_CHAR = 0.19;  // 見積もり：1文字あたりの秒数（仮。台本の「1分300字」に近づけた）
const PAD_SEC = 0.5;        // 見積もり：1会話ごとの間（仮）
const TICK_MS = 100;

export function estimateSec(text) {
  const n = String(text || '').replace(/[\s（）()]/g, '').length;
  return Math.round((n * SEC_PER_CHAR + PAD_SEC) * 10) / 10;
}

export class Player extends EventTarget {
  constructor() {
    super();
    this.story = null;
    this.lines = [];
    this.index = 0;
    this.t = 0;            // 今の会話の中での位置（秒・等速換算）
    this.playing = false;
    this.finished = false;
    this.speed = 1;
    this.volume = 0.8;
    this._timer = null;
    this._last = 0;
    this._lastSaved = 0;
    this.audio = new Audio();
    this.audio.preload = 'auto';
    this.audio.addEventListener('ended', () => { if (this.playing && this._usesAudio(this.index)) this._next(); });
    // 長さの書かれていない音声は、読み込んだ実際の長さを使う（残り時間・30秒戻しの計算のため）
    this.audio.addEventListener('loadedmetadata', () => {
      const l = this.line;
      if (l && l.audio && !(l.duration > 0) && Number.isFinite(this.audio.duration)) l.duration = Math.round(this.audio.duration * 100) / 100;
    });
    this.audio.addEventListener('error', () => {
      // 音声が読めないときは見積もりの動きに切り替える
      if (this.playing && this._usesAudio(this.index)) {
        this._audioFailed.add(this.index);
        this._startTimer();
      }
    });
    this._audioFailed = new Set();
    this._setupMediaSession();
  }

  get loaded() { return !!this.story; }

  durOf(i) {
    const l = this.lines[i];
    if (!l) return 0;
    return typeof l.duration === 'number' && l.duration > 0 ? l.duration : estimateSec(l.text);
  }

  get total() { return this.lines.reduce((a, _, i) => a + this.durOf(i), 0); }

  get elapsed() {
    let s = 0;
    for (let i = 0; i < this.index; i++) s += this.durOf(i);
    return s + this.t;
  }

  get remaining() { return Math.max(0, this.total - this.elapsed); }
  get line() { return this.lines[this.index] || null; }

  async load(storyId, { index = 0, t = 0 } = {}) {
    this.pause();
    const [story, lines] = await Promise.all([getStory(storyId), getScript(storyId)]);
    if (!story) throw new Error(`物語 ${storyId} が見つかりません`);
    this.story = story;
    this.lines = Array.isArray(lines) ? lines : [];
    this.index = Math.min(Math.max(0, index), Math.max(0, this.lines.length - 1));
    this.t = Math.min(Math.max(0, t), this.durOf(this.index));
    this.finished = false;
    this._audioFailed.clear();
    this._updateMetadata();
    this._emit('line');
    this._emit('state');
  }

  unload() {
    this.pause();
    this.story = null;
    this.lines = [];
    this.index = 0;
    this.t = 0;
    this.finished = false;
    this._emit('state');
  }

  _usesAudio(i) {
    const l = this.lines[i];
    return !!(l && l.audio && !this._audioFailed.has(i));
  }

  play() {
    if (!this.story || this.playing) return;
    if (this.finished) { this.index = 0; this.t = 0; this.finished = false; this._emit('line'); }
    this.playing = true;
    if (this._usesAudio(this.index)) this._startAudio();
    else this._startTimer();
    this._setPlaybackState();
    this._emit('state');
  }

  pause() {
    if (!this.playing) return;
    this.playing = false;
    this._stopTimer();
    if (!this.audio.paused) {
      this.t = this.audio.currentTime || this.t;
      this.audio.pause();
    }
    this._setPlaybackState();
    this._emit('progress', { force: true });
    this._emit('state');
  }

  toggle() { this.playing ? this.pause() : this.play(); }

  setSpeed(v) {
    this.speed = v;
    this.audio.playbackRate = v;
  }

  setVolume(v) {
    this.volume = v;
    this.audio.volume = v;
  }

  // 秒数だけ戻す・進める（30秒戻し）
  seekBy(delta) {
    if (!this.story) return;
    this.seekTo(this.elapsed + delta);
  }

  seekTo(sec) {
    if (!this.story) return;
    const wasPlaying = this.playing;
    if (wasPlaying) { this._stopTimer(); this.audio.pause(); }
    let target = Math.max(0, Math.min(sec, this.total - 0.05));
    let i = 0;
    while (i < this.lines.length - 1 && target >= this.durOf(i)) { target -= this.durOf(i); i++; }
    const changed = i !== this.index;
    this.index = i;
    this.t = target;
    this.finished = false;
    if (changed) this._emit('line');
    this._emit('progress', { force: true });
    if (wasPlaying) {
      if (this._usesAudio(this.index)) this._startAudio();
      else this._startTimer();
    }
    this._emit('state');
  }

  _startAudio() {
    const l = this.line;
    // audio は site からの相対パス（例 audio/kinkakuji/k001.wav）。ファイル名だけなら audio/<物語>/ の下を見る
    const src = String(l.audio).includes('/') ? l.audio : `audio/${encodeURIComponent(this.story.id)}/${encodeURIComponent(l.audio)}`;
    if (this.audio.dataset.src !== src) { this.audio.dataset.src = src; this.audio.src = src; }
    this.audio.volume = this.volume;
    this.audio.playbackRate = this.speed;
    try { this.audio.currentTime = this.t; } catch (e) { /* 読み込み前は無視 */ }
    const p = this.audio.play();
    if (p && p.catch) {
      p.catch(() => {
        // 自動再生の制限などで鳴らせないときは一時停止に戻す
        this.playing = false;
        this._setPlaybackState();
        this._emit('state');
      });
    }
    this._startTimer(true);
  }

  _startTimer(followAudio = false) {
    this._stopTimer();
    this._last = performance.now();
    this._timer = setInterval(() => {
      const now = performance.now();
      const dt = (now - this._last) / 1000;
      this._last = now;
      if (followAudio && this._usesAudio(this.index)) {
        this.t = this.audio.currentTime || this.t;
      } else {
        this.t += dt * this.speed;
        if (this.t >= this.durOf(this.index)) { this._next(); return; }
      }
      this._emit('tick');
      if (now - this._lastSaved > 1000) { this._lastSaved = now; this._emit('progress'); }
    }, TICK_MS);
  }

  _stopTimer() {
    if (this._timer) clearInterval(this._timer);
    this._timer = null;
  }

  _next() {
    this._stopTimer();
    if (this.index >= this.lines.length - 1) {
      this.t = this.durOf(this.index);
      this.playing = false;
      this.finished = true;
      this.audio.pause();
      this._setPlaybackState();
      this._emit('end');
      this._emit('state');
      return;
    }
    this.index += 1;
    this.t = 0;
    this._emit('line');
    this._emit('progress', { force: true });
    if (this.playing) {
      if (this._usesAudio(this.index)) this._startAudio();
      else this._startTimer();
    }
  }

  _emit(type, detail) { this.dispatchEvent(new CustomEvent(type, { detail })); }

  // ロック画面・イヤホンの操作（Media Session API）
  _setupMediaSession() {
    if (!('mediaSession' in navigator)) return;
    const ms = navigator.mediaSession;
    const set = (action, fn) => { try { ms.setActionHandler(action, fn); } catch (e) { /* 未対応の操作は無視 */ } };
    set('play', () => this.play());
    set('pause', () => this.pause());
    set('seekbackward', (d) => this.seekBy(-((d && d.seekOffset) || 30)));
    set('seekto', (d) => { if (d && typeof d.seekTime === 'number') this.seekTo(d.seekTime); });
  }

  _updateMetadata() {
    if (!('mediaSession' in navigator) || !this.story || typeof MediaMetadata === 'undefined') return;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: `${this.story.placeShort}　${this.story.title}`,
        artist: '文明の軌跡',
        album: this.story.area,
      });
    } catch (e) { /* 無視 */ }
  }

  _setPlaybackState() {
    if (!('mediaSession' in navigator)) return;
    try { navigator.mediaSession.playbackState = this.playing ? 'playing' : 'paused'; } catch (e) { /* 無視 */ }
  }
}
