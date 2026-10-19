// 進行・図鑑の記録・設定を localStorage に保存する（読み書きは必ず try/catch）
const KEY = 'aruki-v2:state';
const VERSION = 1;

const DEFAULTS = {
  v: VERSION,
  settings: {
    text: 'm',        // 文字の大きさ m（標準）/ l（大）/ xl（特大）
    volume: 0.8,      // 声の音量 0〜1
    motion: 'system', // 動き system（端末に合わせる）/ reduce（減らす）/ full（減らさない）
    level: 'normal',  // 説明の難しさ（今は表示だけ）
    sub: 'm',         // 字幕の大きさ m / l / xl
    speed: 1,         // 再生速度
  },
  progress: null,     // { storyId, index, t, updatedAt }
  records: { places: {}, people: {} }, // { id: { heard: 日時, visited: 日時|null } }
  diary: [],          // [{ at, storyId, quote }]
};

function clone(o) { return JSON.parse(JSON.stringify(o)); }

function load() {
  const base = clone(DEFAULTS);
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return base;
    const saved = JSON.parse(raw);
    if (!saved || saved.v !== VERSION) return base;
    return {
      ...base,
      ...saved,
      settings: { ...base.settings, ...(saved.settings || {}) },
      records: {
        places: { ...(saved.records && saved.records.places) },
        people: { ...(saved.records && saved.records.people) },
      },
      diary: Array.isArray(saved.diary) ? saved.diary : [],
    };
  } catch (e) {
    return base;
  }
}

export const state = load();

export function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    return true;
  } catch (e) {
    return false;
  }
}

// 設定を <html> の属性に映す
export function applySettings() {
  const s = state.settings;
  const root = document.documentElement;
  root.dataset.text = s.text;
  root.dataset.sub = s.sub;
  if (s.motion === 'system') delete root.dataset.motion;
  else root.dataset.motion = s.motion;
}

export function reducedMotion() {
  const m = state.settings.motion;
  if (m === 'reduce') return true;
  if (m === 'full') return false;
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; }
}
